# Quiz Grading - Backend README

> A complete summary of how quizzes are graded in `code-judge-backend`.
> Last reviewed against the source on 2026-10-25.

This document describes the **current runtime behavior**, including edge cases
and known gaps. It is based on the live grading path, not only on older design
notes.

---

## 1. Source of truth

The live grader is:

- `src/services/quizSubmission.service.ts` - `processQuizSubmission()` and
  `processQuizRecalculation()`
- `src/queues/quizSubmission.queue.ts` / `quizSubmission.worker.ts` - async job
- `src/queues/quizRecalculation.queue.ts` / `quizRecalculation.worker.ts` -
  re-grade after question edits
- `src/queues/quizResult.scheduler.ts` - periodic end-of-quiz sweep
- `src/controllers/quiz.controller.ts` - save, submit, submit-status, result,
  review, result generation, visibility rules
- `src/repositories/quiz.repository.ts` - attempt/response persistence and
  leaderboard queries
- `src/services/resultGeneration.service.ts` + `marksheet.service.ts` - manual
  result generation and Excel marksheet
- `src/services/quizResultsEmail.service.ts` +
  `responsesReport.service.ts` - automatic responses report email

The following files contain a **richer reference evaluator that is not wired
into the live grading path**:

- `src/utils/answerParser.ts`
- `src/utils/answerEvaluator.ts`
- `src/utils/aiEvaluator.ts`
- `src/quiz-evaluation.ts`

They are documented separately in section 14. Do not assume their partial
credit, AI grading, or per-type logic is active in production.

---

## 2. TL;DR

1. Students autosave answers to `quiz_student_response`; nothing is scored
   during an active attempt.
2. On explicit submit, answers are persisted and a BullMQ job
   (`quiz-submissions`) is queued for immediate grading.
3. The worker loads the attempt, the quiz, all active questions and options,
   then grades the persisted responses deterministically.
4. `score` is the number of correct answers. `marks_obtained` is the weighted
   mark total. `percentage` is derived from `marks_obtained` when the quiz has
   total marks, otherwise from the correct-answer ratio.
5. Currently all active questions are effectively equally weighted because the
   grading query does not select `quiz_problems.marks`. Negative marking is
   also effectively disabled because `negative_marks` is not selected.
6. Unanswered or invalid answers stay in `skipped_questions`. Some subjective
   answer types are stored but score zero; they are still counted as answered.
7. Attempts still active when the quiz ends are graded by the end-of-quiz
   sweep and marked `timed_out`.
8. Students see results one hour after the quiz `endtime`; owners and accepted
   collaborators see them immediately. `show_results_immediately` is stored but
   not currently used.
9. Editing a question or its options after grading schedules a full
   recalculation of all final attempts.
10. The end-of-quiz scheduler ticks once per minute.

---

## 3. Grading lifecycle

### 3.1 What starts grading

| Trigger | Code path | Result |
|---|---|---|
| Student submits | `POST /api/v1/user/quiz/attempt/:attemptId/submit` -> `enqueueSubmittedQuizAttempt()` | Grades immediately (or inline when no queue exists) |
| Teacher/admin ends quiz | Quiz status update to `ended` -> `enqueueQuizResultCalculation()` | Queues every still-`in_progress` attempt |
| Scheduled end time passes | `quizResult.scheduler.ts` runs every 60 seconds -> `enqueueDueQuizResultCalculations()` | Queues every expired ungraded attempt |
| Student starts/resumes | `startQuizAttempt()` -> `finalizeExpiredQuizAttempts()` | Resolves an expired previous attempt before starting/resuming |
| Analytics/responses endpoints are opened | `getQuizAnalytics()` / `getQuizResponses()` -> `finalizeExpiredQuizAttempts()` | Resolves expired attempts |
| Creator manually generates results | `POST /api/v1/user/quiz/:quizId/generate-results` | Recalculates all final attempts, generates marksheet |
| Teacher edits a question/option | `scheduleQuizRecalculation()` | Recalculates all final attempts |

### 3.2 Attempt deadlines and lateness

Deadline logic lives in `src/utils/quizAttemptTiming.ts`.

- If the quiz has an `endtime`, that time is the deadline for every attempt.
- Otherwise the attempt deadline is:
  `started_at ?? created_at + quiz.duration minutes`.
- If `duration` is unset or zero, the fallback is **15 minutes**.
- A quiz whose status is `ended` is closed even if no deadline is configured.
- A submission is late when `submitted_at > deadline`.
- An attempt still `in_progress` when the quiz closes is graded and marked
  `timed_out`.
- An explicitly submitted late attempt keeps its actual `submitted_at` as the
  effective completion time.
- An attempt still active when the window closes gets `completed_at` at the
  earlier of now and the deadline.
- `time_taken` is calculated from the effective completion time.
- The submit and save endpoints reject writes after the window closes, but the
  end-of-quiz job still grades whatever was already saved.
- A user may have at most **5 attempts** per quiz, with only one
  `in_progress` attempt at a time (`MAX_QUIZ_ATTEMPTS = 5`).

### 3.3 Async pipeline

`quiz-submissions` queue:

- Job name: `grade-submission`
- Job id: `quiz-submit-{attemptId}` (deduplicated per attempt)
- Attempts: 3
- Backoff: exponential, 5 seconds
- Worker concurrency: `min(5, max(1, QUIZ_SUBMISSION_CONCURRENCY || 5))`
- Completed/failed jobs are retained up to 1000/5000 entries

Reliability behavior:

- Before enqueueing, the job payload is also stored in Redis as a durable
  fallback for 24 hours.
- If BullMQ is unavailable, the status endpoint can grade inline using the
  fallback payload.
- A cross-instance Redis lock limits inline recovery to 5 concurrent slots
  (120-second TTL) so serverless invocations do not stampede.
- The worker deletes the fallback after successful grading.
- A retried job for an already `completed` or `timed_out` attempt is a no-op.
  Recalculation jobs explicitly pass `regrade: true` and bypass that check.
- If no Redis queue is configured, `processQuizSubmission()` runs inline.

Grading status endpoint:

- `GET /api/v1/user/quiz/attempt/:attemptId/submit-status`
- Returns `queued`, `processing`, `completed`, `failed`, or `none`.
- On completion, `data.attempt` contains the graded attempt.
- On failure, `data.error` contains the worker error.

### 3.4 Scheduler

`startQuizResultScheduler()`:

- Runs only when `REDIS_URL` is configured.
- Interval: **60 seconds**.
- A tick does two things:
  1. Finds quizzes with expired ungraded attempts and queues them.
  2. Finds quizzes due an automatic responses report email and queues it.
- A `tickInFlight` guard prevents overlapping ticks.
- The first tick runs immediately at startup.

The standalone worker (`npm run worker`) starts the submission worker, the
recalculation worker, the result scheduler, the email worker, and the PDF
worker.

---

## 4. Answer capture and normalization

### 4.1 Accepted request shapes

Autosave (`POST /attempt/:attemptId/save`) accepts:

```json
{
  "problemId": 1,
  "option": "12",
  "options": ["12", "15"],
  "textAnswer": "answer text",
  "timeTaken": 30
}
```

Final submit (`POST /attempt/:attemptId/submit`) accepts only:

```json
{
  "responses": [
    { "problemId": 1, "option": "12" },
    { "problemId": 2, "options": ["12", "15"] },
    { "problemId": 3, "textAnswer": "answer text" }
  ],
  "violations": 0,
  "flagged": false,
  "flagReason": "optional"
}
```

Validation limits:

- `responses` is an array of at most 1000 entries.
- `options` has at most 100 entries.
- `textAnswer` has at most 20,000 characters.
- Both HTTP schemas are strict. A raw `answer` object is supported only by the
  repository method for internal/legacy callers; it is not accepted by the save
  or submit endpoints.

### 4.2 Stored JSONB shapes

`saveStudentResponse()` writes one `quiz_student_response` row per
`(attempt_id, problem_id)` using an upsert:

| Input | Stored `answer` JSONB |
|---|---|
| `option` | `{ "type": "MCQ", "selectedOptionId": <number> }` |
| `options` | `{ "type": "MULTI", "selectedOptionIds": [<numbers>] }` |
| `textAnswer` | `{ "type": "TEXT", "text": "<text>" }` |
| raw `answer` | Stored as-is; internal/legacy repository callers only |

Additional fields:

- `is_attempted` is true when any option/text/raw answer was supplied.
- `time_spent_seconds` is set from `timeTaken` and uses the greater of the old
  and new value.
- `created_at` / `updated_at` are maintained.

### 4.3 What the grader reads

For an explicit submit, a closed/late attempt, or a recalculation, the grader
uses the **persisted response rows**, not the job's inline payload:

- `getStudentResponses(attemptId, userId)` returns rows joined to active and
  deleted problems.
- `savedResponseToSubmission()` maps each stored JSONB value:
  - `selectedOptionId` -> `option`
  - `selectedOptionIds` -> `options`
  - `text` -> `textAnswer`
  - a plain string -> `option`
  - anything else -> ignored
- Legacy jobs may still use their inline `responses` payload only when the
  attempt was not explicitly submitted and the quiz was not closed.

Responses are deduplicated by `problemId`; the **last response wins**. A
response for a problem that no longer exists is ignored. A selected option
that was deleted by the teacher is treated as skipped, not wrong.

The autosave path does not grade anything. It only stores answers.

---

## 5. Live scoring algorithm

The implementation is `processQuizSubmission()` in
`src/services/quizSubmission.service.ts`.

### 5.1 Step-by-step

1. Load the attempt by id.
2. Verify `attempt.user_id === job.userId`; otherwise throw
   `Quiz attempt not found`.
3. Unless this is a `regrade`, stop if the attempt is already `completed` or
   `timed_out`.
4. Load the quiz, all active problems, and all options for each problem.
5. Initialize:
   - `score = 0`
   - `earnedMarks = 0`
   - `correctAnswers = 0`
   - `wrongAnswers = 0`
   - `skippedQuestions = problems.length`
   - `totalQuestions = problems.length`
   - `totalMarks = Number(quiz.total_marks) || 0`
   - `defaultQuestionMarks = totalMarks / totalQuestions` (0 if no questions)
6. For each unique response:
   - If the question is type `2` (multiple choice) and `options` is a
     non-empty array:
     - Empty selection or any unknown/deleted option id -> leave the question
       skipped.
     - Exact set match with all correct option ids -> correct.
     - Anything else -> wrong.
   - Else if `option` resolves to an existing option:
     - `iscorrect === true` -> correct.
     - Otherwise -> wrong.
   - Else if `textAnswer` is non-empty:
     - The question is marked answered (decrement `skippedQuestions`).
     - Only question types `5`, `6`, and `8` are auto-graded:
       - Normalize the submitted text with `trim().toLowerCase()`.
       - Accept an exact match against any option's `matching_target` or
         `option_statement` (also trimmed/lowercased).
       - Match -> correct; otherwise -> wrong.
     - All other text types are stored but receive no score.
   - Otherwise the question remains skipped.
7. Correct answers:
   - `score += 1`
   - `earnedMarks += Number(problem.marks) || defaultQuestionMarks`
8. Wrong answers:
   - If `quiz.negative_marking === true`, subtract
     `Math.abs(Number(problem.negative_marks) || 0)` from `earnedMarks`.
9. Compute:
   - `marksObtained = totalMarks > 0 ? earnedMarks : score`, rounded to two
     decimals.
   - `percentage = totalMarks > 0
      ? (marksObtained / totalMarks) * 100
      : (correctAnswers / totalQuestions) * 100`, rounded to two decimals.
10. Persist valid responses (skipped for recalculation).
11. Persist the scorecard on `quiz_attempt`.

### 5.2 Important current limitation: per-question marks are not loaded

`quiz_problems` has `marks` and `negative_marks` columns, and the grading code
intends to use them. However, `QuizRepository.getQuizProblems()` does not
select those two columns. As a result, in the current code:

- `problem.marks` is always `undefined`, so every correct answer uses
  `defaultQuestionMarks = totalMarks / totalQuestions`.
- `problem.negative_marks` is always `undefined`, so negative marking subtracts
  `0` even when `quiz.negative_marking = true`.

If `marks` and `negative_marks` are added to the `getQuizProblems()` select
list, the existing grading logic will start using per-question values without
further changes.

### 5.3 Question type matrix (live behavior)

Type ids come from `quiz_problem_type` in the database.

| ID | Type | Live grading behavior |
|---:|---|---|
| 1 | single_choice | Selected option id must exist; correct if `iscorrect`; otherwise wrong. |
| 2 | multiple_choice | Exact set match of selected ids against correct ids. No partial credit. Invalid/deleted option -> skipped. |
| 3 | true_false | Graded as an option id; correct if the selected option has `iscorrect = true`. The boolean value path exists only in the unused reference evaluator. |
| 4 | text | Stored; counted as answered; no score. |
| 5 | paragraph | Exact trimmed/lowercase text match against an option's `matching_target` or `option_statement`. |
| 6 | fill_blanks | Exact trimmed/lowercase match of the single text answer. No per-blank partial credit. |
| 7 | table_fill | Stored; no score. If an option id is sent instead, it is treated as single choice. |
| 8 | code_output | Exact trimmed/lowercase text match against an accepted option value. |
| 9 | math | Stored; no score. If an option id is sent, it is treated as single choice. |
| 10 | graph | Stored; no score. If an option id is sent, it is treated as single choice. |
| 11 | formula | Stored; no score. If an option id is sent, it is treated as single choice. |
| 12 | matching | Stored; no score. If an option id is sent, it is treated as single choice. |
| 13 | ordering | Stored; no score. If an option id is sent, it is treated as single choice. |
| 14 | drag_drop | Stored; no score. If an option id is sent, it is treated as single choice. |
| 15 | categorize | Stored; no score. If an option id is sent, it is treated as single choice. |
| 16 | hotspot | Stored; no score. If an option id is sent, it is treated as single choice. |
| 17 | image_label | Stored; no score. If an option id is sent, it is treated as single choice. |
| 18 | drawing | Stored; no score. |
| 19 | video_response | Stored; no score. |
| 20 | audio_response | Stored; no score. |
| 21 | poll | If an option id is sent, it is treated as single choice; text is stored with no score. |
| 22 | word_cloud | Stored; no score. |

Summary:

- **Auto-graded:** 1, 2, 3 (as option), 5, 6, 8.
- **Stored but not auto-graded:** 4, 7, 9-22.
- Any question type can accidentally fall into the single-choice branch if the
  client sends an `option` id for it.

### 5.4 `score`, `marks_obtained`, and `percentage`

- `score` is an integer count of correct answers. It is **not** the weighted
  mark total.
- `marks_obtained` is the weighted total:
  - if `quiz.total_marks > 0`, it is the sum of earned marks minus negative
    deductions;
  - if `quiz.total_marks` is `0` or missing, it falls back to `score`.
- `percentage`:
  - if `quiz.total_marks > 0`, `marks_obtained / total_marks * 100`;
  - otherwise `correct_answers / total_questions * 100`.
- Both `marks_obtained` and `percentage` are rounded to two decimals.
- There is no clamping. A negative `marks_obtained` can produce a negative
  percentage, which may violate the database's `0..100` percentage check.
- If there are no questions, `score`, `marks_obtained`, and `percentage` are
  `0`.

### 5.5 Counter semantics and edge cases

- `skipped_questions` starts at the number of active questions and is
  decremented for **any** valid response, including subjective answers that
  receive no score.
- Therefore `correct + wrong + skipped` can be less than `total_questions` when
  answered-but-ungraded subjective questions exist.
- An unanswered question, an invalid option id, or an option deleted by the
  teacher stays in `skipped_questions`.
- A wrong answer is only counted as wrong when it can be interpreted; an
  uninterpretable answer is skipped.
- Duplicate responses for the same problem: the last one wins.
- Soft-deleted questions are excluded from `total_questions`, so deleting a
  question after an attempt changes the denominator on recalculation.
- `getQuizProblems()` orders questions by `question_number`, then `id`.
  Options are ordered by `sort_order`, then `id`. Student-facing shuffling does
  not affect grading because grading uses option ids.
- Editing `quiz.total_marks` alone does not schedule a recalculation. A later
  recalculation (or manual generation) will use the new total marks.

---

## 6. Recalculation after question or option edits

`scheduleQuizRecalculation(quizId)` is called after grading-relevant changes
to questions/options.

### 6.1 When it runs

- A question is created, updated, duplicated, or deleted.
- Options are added, updated, removed, or reordered in a way that changes
  grading.
- `saveQuizProblemFull()` returns `gradingChanged: true` when:
  - the question type changes;
  - `marks` changes;
  - `negative_marks` changes;
  - any option's statement, description, matching target, correctness, or
    existence changes.

### 6.2 Guards

- Recalculation does nothing if the quiz has no `completed` or `timed_out`
  attempts (`hasFinalQuizAttempts()`).
- A revision string is computed from the latest `updated_at` of the quiz's
  active questions and options.
- Recalculation jobs use `quiz-recalculate-{quizId}-{revision}` so repeated
  saves coalesce.
- If the revision has changed by the time the job runs, the stale job no-ops.
- Queue: `quiz-recalculations`, concurrency capped at 2, 3 attempts with
  exponential 5-second backoff.
- If Redis is unavailable, or `VERCEL=1`, recalculation runs inline.

### 6.3 What a regrade changes

`processQuizSubmission({ regrade: true })`:

- Re-reads persisted responses.
- Recomputes `score`, `percentage`, `correct_answers`, `wrong_answers`,
  `skipped_questions`, `total_questions`, `total_marks`, and
  `marks_obtained`.
- Does **not** change `status`, `submitted_at`, `completed_at`, `time_taken`,
  `violations`, `flagged`, `flag_reason`, or `rank`.
- Does not rewrite response rows.

---

## 7. Persisted scorecard fields

`quiz_attempt` stores the result:

| Field | Meaning |
|---|---|
| `status` | `in_progress`, `completed`, or `timed_out` |
| `submitted_at` | Explicit submit time, or effective completion time when the attempt was finalized without an explicit submit |
| `completed_at` | Effective grading completion time |
| `time_taken` | Seconds from `started_at ?? created_at` to effective completion |
| `total_questions` | Number of active questions at grading time |
| `score` | Integer count of correct answers |
| `correct_answers` | Correct count |
| `wrong_answers` | Wrong count |
| `skipped_questions` | Unanswered/invalid count (see 5.5) |
| `total_marks` | Quiz total marks copied at grading time |
| `marks_obtained` | Weighted marks total |
| `percentage` | Two-decimal percentage |
| `rank` | Stored column, but not written by the current grading pipeline |
| `violations` | Proctoring violation count |
| `flagged` | Whether the attempt was flagged for review |
| `flag_reason` | Concatenated/truncated reason |
| `decoy_map` | Private per-attempt AI decoy choices |

Response rows store `answer`, `is_attempted`, and `time_spent_seconds`.

---

## 8. Ranks, leaderboard, and passing marks

### 8.1 Rank

- The grading pipeline does **not** write `quiz_attempt.rank`.
- The rank-on-read calculation in `getQuizResult()` is currently commented out.
  A student result may therefore return `rank: null`.
- The leaderboard computes a rank at query time with `ROW_NUMBER()`.
- The marksheet and responses report fall back to the row index when `rank` is
  null.
- `ResultGenerationService.hasGeneratedResults()` checks for a completed
  attempt with `rank IS NOT NULL`. Because rank is not written by grading, this
  duplicate-prevention check does not currently detect previously generated
  results.

### 8.2 Leaderboard

`GET /api/v1/user/quiz/:quizId/leaderboard`

- Only `completed` attempts are included; `timed_out` attempts are excluded.
- Order:
  1. `COALESCE(marks_obtained, score)` descending
  2. `time_taken` ascending
  3. `completed_at` ascending
- The response rank is computed on read.
- The leaderboard must be enabled on the quiz, unless the caller is the owner.
- Multiple attempts by the same user can appear as multiple leaderboard rows;
  there is no best-attempt-only filter.

### 8.3 Passing marks

- `quiz.passing_marks` is stored and validated against total marks.
- It is returned in quiz/result/analytics payloads, and analytics counts
  `passed_count` as attempts where `score >= passing_marks`.
- There is no pass/fail flag written to the attempt or result.
- Because `score` is a correct-answer count while `passing_marks` is a mark
  value, this comparison can be inconsistent when total marks differ from the
  question count.

---

## 9. Result visibility

Implemented in `quiz.controller.ts`.

- An `in_progress` attempt is never visible as a result or review.
- The owner and accepted collaborators can see results immediately after the
  attempt is final.
- A student can see the result only when:
  - the attempt is not `in_progress`; and
  - `quiz.endtime` exists; and
  - `now >= endtime + 1 hour`.
- If `endtime` is null, students cannot see the result.
- `show_results_immediately` is stored on the quiz but is **not used** by the
  current visibility gate.
- `GET /previous` hides `score`, `percentage`, `rank`, `correct_answers`,
  `wrong_answers`, and `skipped_questions` until the same endtime + 1 hour
  threshold.
- The question-wise review uses the same gate.

---

## 10. Reports, marksheets, and emails

### 10.1 Manual result generation

`POST /api/v1/user/quiz/:quizId/generate-results` (creator only)

Body:

```json
{ "force": false, "sendEmail": true }
```

Flow:

1. Reject if the quiz has not ended (`QUIZ_NOT_ENDED`).
2. If `force` is false and results are considered already generated, reject
   with `RESULTS_ALREADY_GENERATED`. (See the rank caveat in 8.1.)
3. If `in_progress` attempts remain, queue result calculation and check again.
   If still pending, return `RESULTS_PENDING`.
4. Recalculate every final attempt (`completed` and `timed_out`).
5. Generate the Excel marksheet.
6. Enqueue the marksheet email to the quiz creator.
7. If marksheet generation or enqueueing fails, results remain saved and the
   response reports `emailSent: false` plus `emailError`. Actual delivery happens
   asynchronously in the email worker.

`POST /api/v1/user/quiz/:quizId/retry-email` only regenerates the marksheet and
resends the email. It does not recalculate results.

### 10.2 Excel marksheet

`generateMarksheet()` uses ExcelJS.

- Only `status = 'completed'` attempts are included. `timed_out` attempts are
  excluded.
- Sorted by roll number ascending (`NULLS LAST`), then username.
- Columns:
  Roll Number, Student Name, Username, Email, College, Quiz Name, Quiz Code,
  Attempt Date, Quiz Duration (min), Time Taken (min), Total Questions,
  Correct, Wrong, Skipped, Marks Obtained, Percentage, Rank.
- The "Marks Obtained" column uses `quiz_attempt.score`, not
  `marks_obtained`.
- Rank uses `attempt.rank || rowIndex + 1`.
- Stats:
  - `totalParticipants` = number of completed attempts
  - `totalSubmissions` = completed attempts
  - `completionRate` = submissions / participants (effectively 100 for this
    filtered set)
  - `averageMarks`, `highestMarks`, `lowestMarks` from `score`
  - `averageTimeTaken`
  - `highestPercentage`
- The email subject is `Quiz Report - <Quiz Name>` and the recipient is the
  creator only.

### 10.3 Automatic responses report

`maybeQueueQuizResponsesEmail()` / `processQuizResponsesEmail()`:

- Runs after submissions and during the end-of-quiz sweep.
- Sends only when:
  - the quiz has ended;
  - the creator has an email;
  - no `in_progress` attempts remain;
  - no report was already sent for this quiz session.
- `quiz.responses_email_sent_at` is reset when the quiz is set to `live`, so a
  new session can send a new report.
- The report is generated by `responsesReport.service.ts` and sent to the
  creator only.
- It includes registrations and attempts, status labels, flags, registration
  fields, correct/wrong/skipped counts, and a percentage computed as
  `correct_answers / total_questions`, not the stored `percentage`.
- It is separate from the manual marksheet.

---

## 11. Proctoring and decoys (non-scoring)

Neither of these changes the score.

### 11.1 Proctoring

- `MAX_PROCTORING_VIOLATIONS = 3`.
- `reportViolation` increments `violations`; at 3 the attempt is flagged.
- The frontend auto-submits flagged attempts.
- Submit merges:
  - `violations = max(stored, submitted)`
  - `flagged = stored || submitted || violations >= 3`
  - `flag_reason` = joined old/new reasons, truncated to 500 characters.
- Flags are stored and reported to the creator but do not alter marks.

### 11.2 AI decoys

- `prepareAttemptDecoys()` selects a wrong option for choice questions
  (types 1, 2, 3) and builds a fake "trap" explanation.
- The selection is stored privately in `quiz_attempt.decoy_map`; it is never
  returned to the student.
- The explanation is cached by question/option.
- Decoy hits are analytics-only (`decoy_hits`, `decoy_questions`,
  `decoy_flagged`); they do not affect grading.

---

## 12. Endpoint cheat sheet

All routes are under `/api/v1/user/quiz` unless noted.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/attempt/:attemptId/save` | Autosave one answer |
| POST | `/attempt/:attemptId/submit` | Persist final answers and enqueue grading |
| GET | `/attempt/:attemptId/submit-status` | Poll grading status |
| GET | `/result/:attemptId` | Get scorecard (visibility-gated) |
| GET | `/result/:attemptId/review` | Question-wise review (visibility-gated) |
| GET | `/previous` | Attempt history with hidden scores until visible |
| GET | `/:quizId/leaderboard` | Computed leaderboard |
| POST | `/:quizId/generate-results` | Recalculate, build marksheet, email creator |
| POST | `/:quizId/retry-email` | Resend marksheet without recalculating |
| GET | `/:quizId/analytics` | Creator analytics; also finalizes expired attempts |
| GET | `/:quizId/responses` | Response dashboard; also finalizes expired attempts |

Related triggers:

- Quiz status update to `ended` queues all pending attempts.
- `GET /api/v1/user/quiz/:quizId/analytics` and `/responses` call
  `finalizeExpiredQuizAttempts()` before returning data.

---

## 13. Configuration

| Variable | Effect |
|---|---|
| `REDIS_URL` | Enables BullMQ queues, fallback recovery, and the scheduler |
| `QUIZ_SUBMISSION_CONCURRENCY` | Submission worker concurrency; capped at 5 |
| `QUIZ_RECALCULATION_CONCURRENCY` | Recalculation worker concurrency; capped at 2 |
| `VERCEL` | When `1`, recalculation runs inline instead of enqueueing |
| `DISABLE_BACKGROUND_WORKERS` | Used by deployment setup when running a separate worker process |

Without Redis:

- Grading still works inline.
- The periodic scheduler does not run.
- Expired attempts are resolved by request-time triggers (start, analytics,
  responses, manual result generation).

---

## 14. Reference evaluator utilities (not wired into live grading)

These modules implement a more complete grading model but are **not imported by
the live submission path**. They are useful as a specification for future work.

### 14.1 `answerParser.ts`

- Maps numeric question type ids to names.
- Validates raw answers with Zod schemas.
- Normalizes answers into a canonical representation.
- Classifies:
  - Objective: `MCQ`, `MSQ`, `TRUE_FALSE`, `NUMERICAL`, `FILL_BLANK`,
    `MATCHING`, `ORDERING`, `TABLE_FILL`.
  - Subjective/AI: `TEXT`, `PARAGRAPH`, `SUBJECTIVE`, `CODE_OUTPUT`, `MATH`,
    `GRAPH`, `FORMULA`, `DRAWING`, `VIDEO_RESPONSE`, `AUDIO_RESPONSE`.
- Supports legacy plain-string/number answers.
- Never crashes on malformed JSON.

### 14.2 `answerEvaluator.ts`

- `MCQ`: full marks for the correct option; `-negativeMarks` for wrong or
  missing option.
- `MSQ`: full marks for an exact set; `floor(50% of max)` when the selected set
  is a correct subset; `-negativeMarks` for invalid or incorrect selections.
- `TRUE_FALSE`: parses the correct option statement into a boolean; full marks
  or `-negativeMarks`.
- `NUMERICAL`: parses the expected value; tolerance `0.001`; full marks or
  `-negativeMarks`.
- `FILL_BLANK`: compares each blank case-insensitively; full marks for all,
  partial credit `floor(correctCount / expectedCount * max)`, otherwise
  `-negativeMarks`.
- `MATCHING`: exact pair set for full marks; partial credit by correct pairs,
  floored at `-negativeMarks`.
- `ORDERING`: correct order is the option id order; full marks for exact order;
  partial credit by correct positions, floored at `-negativeMarks`.
- Unsupported type: zero.
- Note: `TABLE_FILL` is classified as objective by the parser but is not handled
  by the evaluator's switch.

### 14.3 `aiEvaluator.ts`

- Builds a prompt containing the question, context, model answer, evaluation
  criteria, reference notes, and student answer.
- Requests JSON with `score` (0..max) and `feedback`.
- Clamps the score to `[0, maxScore]`.
- Sets `isCorrect = score > maxScore * 0.5`.
- Returns a zero-score fallback on any error; it never throws.
- `prepareForAIEvaluation()` produces a JSON representation for the LLM.

### 14.4 `quiz-evaluation.ts`

A barrel file exporting the answer types, parser, objective evaluator, and AI
evaluator. It is not imported by the live grading service.

---

## 15. Known gaps and current behavior notes

1. **Per-question marks are not fetched.** `getQuizProblems()` omits `marks`,
   so the equal-share fallback is always used.
2. **Negative marking is effectively disabled.** `negative_marks` is not
   fetched, so wrong answers subtract zero.
3. **No partial credit in live grading.** MSQ, fill-blank, matching, and
   ordering partial-credit logic exists only in the unused reference evaluator.
4. **Subjective answers score zero.** Types such as text, math, graph, formula,
   matching, ordering, drawing, and media responses are stored but not scored.
5. **There is no manual grading endpoint.** Subjective answers cannot be
   manually assigned marks through the current backend API.
6. **`skipped_questions` is not strictly "unanswered".** Answered-but-ungraded
   subjective questions are removed from the skipped count.
7. **`score` and `marks_obtained` are different scales.** Leaderboard uses
   `COALESCE(marks_obtained, score)`; marksheet and analytics use `score`.
8. **Rank is not persisted.** Student results may have `rank: null`; the
   leaderboard computes rank on read.
9. **The "already generated" check is ineffective** while rank remains null.
10. **The marksheet excludes `timed_out` attempts** and uses `score` for the
    "Marks Obtained" column.
11. **The automatic responses report uses a different percentage formula** than
    the scorecard.
12. **`show_results_immediately` is ignored**; students wait until
    `endtime + 1 hour`.
13. **Passing marks only affect analytics**, not the stored result.
14. **Percentages are not clamped.** Negative marks or over-weighted questions
    could produce values outside `0..100`.
15. **Editing only `total_marks` does not schedule a recalculation.** Run
    manual result generation or trigger a question edit to recalculate.
16. **Question-level analytics references columns that do not exist.**
    The queries use `quiz_student_response.is_correct` and `time_spent_ms`, but
    neither column is present in the migrations; the primary query fails and
    the fallback reports zero correct responses and no timing stats.
17. **Multiple attempts are not collapsed.** Leaderboards and marksheets can
    contain multiple rows for the same user.

---

## 16. File map

| File | Role |
|---|---|
| `src/services/quizSubmission.service.ts` | Live grading, recalculation, queue orchestration |
| `src/queues/quizSubmission.queue.ts` | Submission queue, fallback storage, recovery lock |
| `src/queues/quizSubmission.worker.ts` | Submission worker |
| `src/queues/quizRecalculation.queue.ts` | Recalculation queue |
| `src/queues/quizRecalculation.worker.ts` | Recalculation worker |
| `src/queues/quizResult.scheduler.ts` | 60-second end-of-quiz sweep |
| `src/queues/startWorker.ts` | Standalone worker entry point |
| `src/controllers/quiz.controller.ts` | Save, submit, status, result, visibility, generation |
| `src/controllers/adminQuizController.ts` | Admin status changes and recalc triggers |
| `src/repositories/quiz.repository.ts` | Attempt/response persistence, leaderboard, queries |
| `src/repositories/quizProblemOptions.ts` | Option sync and grading-change detection |
| `src/services/resultGeneration.service.ts` | Manual result generation |
| `src/services/marksheet.service.ts` | Excel marksheet |
| `src/services/quizResultsEmail.service.ts` | Automatic responses report email |
| `src/services/responsesReport.service.ts` | Responses report workbook |
| `src/services/email.service.ts` | Email delivery |
| `src/utils/quizAttemptTiming.ts` | Deadline and lateness rules |
| `src/utils/answerParser.ts` | Reference answer parser (unused live) |
| `src/utils/answerEvaluator.ts` | Reference objective evaluator (unused live) |
| `src/utils/aiEvaluator.ts` | Reference AI evaluator (unused live) |
| `src/quiz-evaluation.ts` | Reference evaluator barrel (unused live) |
| `src/services/quizDecoy.ts` / `quizDecoy.service.ts` | Private AI decoy map |
| `src/types/quiz-answer.ts` | Answer schemas and question type constants |
| `database/migrations/01_quiz.sql` | Core quiz/attempt/response tables |
| `database/migrations/04_quiz_attempt.sql` | Attempt score columns |
| `database/migrations/07_quiz_attempt_proctoring.sql` | Violations/flags |
| `database/migrations/12_quiz_relational_integrity.sql` | Score/timing constraints |
| `database/migrations/45_quiz_attempt_soft_delete.sql` | Attempt soft delete |
| `database/migrations/49_quiz_ai_decoy.sql` | `decoy_map` column |
| `database/migrations/58_quiz_responses_email.sql` | `responses_email_sent_at` |
| `database/migrations/59_quiz_option_sort_order.sql` | Option ordering |

---

## 17. Related documentation

- `QUIZ_MODULE_BACKEND.md` - module overview and API details
- `QUIZ_STUDENT_FLOW.md` - student attempt flow
- `QUIZ_CREATION_FLOW.md` - creator flow
- `QUIZ_STUDENT_CALL_MAP.md` - frontend-to-backend call map
