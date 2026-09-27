# Quiz Student Flow — Backend README

> Complete backend reference for everything a **student** does with a quiz: discover → join/register → start attempt → answer/autosave → proctoring → submit → result/review/history/leaderboard. For quiz *creation*, see `QUIZ_CREATION_FLOW.md`.

Base prefix: `app.use("/api", apiRoutes)` → **`/api/v1/user/quiz`** (`src/routes/v1/user/quiz.routes.ts:1-61`).

**Every route in this file requires authentication**: `router.use(authenticate)` (`src/routes/v1/user/quiz.routes.ts:60-61`).
Auth (`src/middleware/auth.ts:21-71`): token comes from the `session_token` cookie **or** `Authorization: Bearer <jwt>`; Redis `blacklist:<token>` is checked, then `jwt.verify(token, JWT_SECRET)` sets `req.user = { userId, email }`. Missing/invalid token → `401 { success: false, message }`.

**Response envelope** (all endpoints): `{ success: boolean, message?: string, data?: any, pagination?: { page, limit, total, totalPages } }`. Zod validation failures → `400 { success: false, message: "Validation error (<field>): <msg>" }` (`src/middleware/validate.ts:56-77`).

---

## 1. End-to-end sequence

```
Student                               Backend                              DB
───                                     ───                                ──
GET  /code/:code ─────────────────────► getQuizByCode ────────────────► quiz (+status/visibility/difficulty lookups)
POST /join { code } ──────────────────► joinQuiz ─────────────────────► quiz → quiz_registration (upsert)
POST /register { quizId, rollno } ────► registerForQuiz ──────────────► quiz_registration (upsert, no attempt)
DELETE /register/:quizId ─────────────► unregisterFromQuiz ───────────► quiz_registration.is_registered=false
POST /:quizId/start ──────────────────► startQuizAttempt ─────────────► access checks → quiz_attempt (resume or create) + quiz_problems + options
POST /attempt/:id/save ───────────────► saveQuizResponse ─────────────► quiz_student_response (upsert per question)
POST /attempt/:id/violation ──────────► reportViolation ──────────────► quiz_attempt.violations/flagged/flag_reason
POST /attempt/:id/submit ─────────────► submitQuizAttempt ────────────► grade → quiz_student_response (upsert) → quiz_attempt completed
GET  /result/:attemptId ──────────────► getQuizResult ────────────────► quiz_attempt JOIN quiz
GET  /result/:attemptId/review ───────► getQuizReview ────────────────► quiz_problems + responses + options
GET  /previous ───────────────────────► getPreviousQuizzes ──────────► quiz_attempt JOIN quiz (history)
GET  /my ─────────────────────────────► getMyQuizzes ────────────────► quiz_registration + attempt details
GET  /:quizId/leaderboard ────────────► getQuizLeaderboard ──────────► completed attempts ordered by score
```

---

## 2. Discover a quiz

| Endpoint | Handler chain | Notes |
|---|---|---|
| `GET /?page,limit,search,status,visibility,difficulty,sortBy,sortOrder` | `getAllQuizzes` (`src/controllers/quiz.controller.ts:41`) → `QuizService.getAllQuizzes` (`src/services/database/quiz.service.ts:12`) → `QuizRepository.getAllQuizzes` (`src/repositories/quiz.repository.ts:10`) | **Filters to quizzes created by the caller** (`createdby = userId`, `quiz.repository.ts:62-66`) — effectively "my created", not an open catalogue. `200 { success, data, pagination }`. |
| `GET /code/:code` | `getQuizByCode` (`quiz.controller.ts:169`) → `QuizRepository.getQuizByCode` (`quiz.repository.ts:195`) | Code is `trim().toUpperCase()`-normalized; must match `/^[A-Z]{16}$/` and quiz status must be `scheduled`/`live`, else `404 Quiz not found or unavailable`. Returns the student-safe DTO `toStudentQuiz` (`quiz.controller.ts:17-28`): only `id, code, name, starttime, endtime, duration, total_marks, passing_marks, difficulty, status` — never owner internals. |
| `GET /:quizId` | `getQuizById` (`quiz.controller.ts:99`) → `QuizRepository.getQuizById` (`quiz.repository.ts:132`) | No owner check. Strips `code` from the response (`quiz.controller.ts:112`). `404 Quiz not found`. Defined **after** `/my`, `/previous`, `/code/:code`, etc. (`quiz.routes.ts:66-122`) so specific routes aren't shadowed. |
| `GET /:quizId/problems/public` | `getQuizProblemsPublicController` (`quiz.controller.ts:1932`) + `attachQuizProblemOptions(quizId, false)` (`quiz.controller.ts:1875`) | Requires `checkQuizAccess`. Sanitized: drops `explaination, hint, reference_notes, internal_comments` per problem and `iscorrect` per option (`quiz.controller.ts:1883-1895`). Failing access → `403 Quiz access denied`. |

---

## 3. Join / register

Validation (`src/middleware/validate.ts`):
- `joinQuizSchema` (`:138`): `{ code: /^[A-Za-z]{16}$/ → UPPERCASE }`, `.strict()`.
- `quizRegistrationSchema` (`:149`): `{ quizId: int+, rollno?: trim max 50 }`.

| Endpoint | Handler chain | Behaviour |
|---|---|---|
| `POST /join { code }` | `joinQuiz` → `getQuizByCode` → `checkQuizAccessForRegistration` → `registerUser` | Registration is upserted, but the attempt is created only when the student enters exam mode so waiting time never consumes exam duration. Returns `attempt: null`. |
| `POST /register { quizId, rollno }` | `registerForQuiz` → `checkQuizAccessForRegistration` → `isUserRegistered` → `registerUser` | `400 quizId required`; `403 <reason>`; `409 User already registered`. No attempt row is created. `201 { success, message: "Successfully registered", data: registration }`. |
| `DELETE /register/:quizId` | `unregisterFromQuiz` | Marks registration inactive. An active attempt cannot be unregistered (`409`). |

**Access gate** — `checkQuizAccessForRegistration` (`quiz.repository.ts:1307`): quiz missing → deny; status `draft`/null → "not available"; `ended` or `endtime < now` → "has ended"; **audience allow-list** — if `quiz_participants` has any rows for the quiz, only rows with `status = 1` may proceed, else "You are not invited". An empty participant table means open access. No `starttime` block (pre-start registration allowed).

---

## 4. Start attempt

`POST /:quizId/start` (`quiz.routes.ts:168`): `startQuizAttempt` (`quiz.controller.ts:1068`) → `checkQuizAccess` (`quiz.repository.ts:1248`) + problems/options + `getQuizAttempt` / `createQuizAttempt` / `updateQuizAttempt`.

`checkQuizAccess` additionally enforces vs registration: status must be `live` ("not live"), `starttime > now` ("not started"), must have `quiz_registration.is_registered`, same audience rule, and an existing `in_progress` attempt returns `{ allowed: true, reason: "resume", attemptId }`.

Controller outcomes:
- `403 <reason>` when not allowed.
- **Resume**: returns `{ attempt, problems, savedResponses, remainingSeconds }`; answers restore from the server and remaining time is calculated from `started_at`, duration, and quiz end time. Enabled question/option shuffling is stable for the attempt.
- A completed/timed-out attempt does not resume. Starting again creates a new attempt ID; a partial unique index permits only one `in_progress` attempt per student and quiz.
- Zero questions → `400 This quiz has no questions`.
- Else creates `quiz_attempt(user_id, quiz_id, total_questions, status='in_progress')` (`quiz.repository.ts:897`) → `201 { message: "Quiz started successfully", data: { attempt, problems } }` with full options (student view still sanitized of `iscorrect` at this stage).

---

## 5. Answer autosave

`POST /attempt/:attemptId/save` (`quiz.routes.ts:171`), validated by `saveQuizResponseSchema` (`validate.ts:196`): `{ problemId: int+, option?, textAnswer?, timeTaken? }`.

`saveQuizResponse` (`quiz.controller.ts:1165`):
- `401` no user; `400 problemId required`.
- `404 Active quiz attempt not found` unless the attempt exists, belongs to the caller, and is `in_progress`.
- `400 Question does not belong to this quiz` unless `problem.quiz_id == attempt.quiz_id`.
- Saves are deadline-checked and upsert MCQ/text answers plus `time_spent_seconds`. Clearing an answer sets `is_attempted=false`. The frontend saves MCQs immediately and text answers on blur; local storage is only an offline fallback.

---

## 6. Exam-cell proctoring (anti-cheat)

`MAX_PROCTORING_VIOLATIONS = 3` (`quiz.controller.ts:1227`). The frontend exam shell reports one event per episode: `tab_switch`, `window_blur`, `fullscreen_exit`, `copy_attempt`, `cut_attempt`, `paste_attempt`.

`POST /attempt/:attemptId/violation { type }` (`quiz.routes.ts:174`), validated by `reportViolationSchema` (`validate.ts:207`, 1–50 chars): `reportViolation` (`quiz.controller.ts:1236`):
- `404 Quiz attempt not found` (also covers wrong owner); `400 Attempt is no longer active` unless `in_progress`.
- `violations = stored + 1`; `flagged = violations >= 3`; `flag_reason` appends `"<type>#<n>"`.
- Persists via `updateQuizAttempt` (allow-list includes `violations, flagged, flag_reason`, `quiz.repository.ts:911-920`; columns from `database/migrations/07_quiz_attempt_proctoring.sql`).
- `200 { success, data: { violations, flagged, maxAllowed: 3 } }`. At 3, the frontend auto-submits with the flag (next section).

---

## 7. Submit & grading

`POST /attempt/:attemptId/submit` (`quiz.routes.ts:177`): `submitQuizAttempt` (`quiz.controller.ts:1294`). Body: `{ responses: [{ problemId, option?, textAnswer? }], violations?, flagged?, flagReason? }` (proctor fields are a fallback in case live violation reports failed).

- `400 responses must be an array`; `404` ownership; `400 Quiz already submitted` if `completed`.
- **Flag merge**: `violations = max(stored, sent)`; `flagged = stored || sent || violations >= 3`; `flag_reason` joins old + sent reason (or `"auto-flagged"`).
- **Grading**: submission bodies are strictly validated and deduplicated by problem ID. Correct answers use per-question marks when configured (otherwise an equal share of quiz total); configured negative marks apply to wrong answers when enabled. Subjective answers are stored for manual grading. The server rechecks deadlines and late attempts become `timed_out`.
- Persists every valid response via `saveStudentResponse` (upsert, so autosaved answers merge), computes `time_taken` from `started_at ?? created_at`, then `updateQuizAttempt({ status: completed, completed_at, score, percentage, correct/wrong/skipped, total_marks, marks_obtained, violations, flagged, flag_reason, time_taken })`.
- Client contract: the frontend keeps answers in `localStorage` during the attempt and sends them all in this single call; nothing is graded before submit. `200 { success, message: "Quiz submitted successfully", data: updatedAttempt }`.

---

## 8. Result, review, history, leaderboard

| Endpoint | Handler chain | Notes |
|---|---|---|
| `GET /result/:attemptId` | `getQuizResult` (`quiz.controller.ts:1595`) → `QuizRepository.getQuizResult` (`quiz.repository.ts:1421`: `quiz_attempt JOIN quiz`, `WHERE qa.id AND qa.user_id`) | Ownership enforced. `404 Quiz result not found`. Row includes `violations, flagged, flag_reason`. |
| `GET /result/:attemptId/review` | `getQuizReview` → `getQuestionWiseReview` | Correct answers are exposed only to the attempt owner and only when immediate results are enabled or the quiz has ended; otherwise `403`. |
| `GET /previous` (alias `/old-quizzes`) | `getPreviousQuizzes` (`quiz.controller.ts:1543`) → `QuizRepository.getPreviousQuizzes` (`quiz.repository.ts:1351`) | All statuses for the caller; `search` on quiz name; sort whitelist `score, percentage, time_taken, completed_at`. `200 { data, pagination }`. |
| `GET /my` | `getMyQuizzes` (`quiz.controller.ts:1450`) → `getUserQuizzes` (`quiz.repository.ts:357`) | Registrations with attempt details (`attempt_id, score, status…`), ordered by `starttime DESC`. No pagination. |
| `GET /:quizId/leaderboard` | `getQuizLeaderboard` (`quiz.controller.ts:1783`) → `getQuizById` + `getQuizLeaderboard` (`quiz.repository.ts:1001`: completed attempts `ORDER score DESC, time_taken ASC, completed_at ASC`, joins user/avatar/college) | `404 Quiz not found`; `403 Leaderboard disabled` unless `quiz.leaderboard` is on (owner bypasses). Open to any authenticated user when enabled. |

---

## 9. Data model (student-relevant columns)

- **`quiz`**: `id PK`, `code UNIQUE`, `createdby FK users`, `starttime/endtime`, `visibility`/`difficulty` FKs, `subject_id`, `exam_cat`, `duration` (minutes), `total_marks`/`passing_marks`, `shuffle_questions/options`, `show_results_immediately`, `negative_marking`, `leaderboard bool`, `quiz_status FK quiz_status` (compared case-insensitively).
- **`quiz_registration`**: `id, user_id, quiz_id, is_registered, rollno`; `UNIQUE(user_id, quiz_id)` is the upsert key (`05_quiz_registration_unique.sql`).
- **`quiz_attempt`**: `id, user_id, quiz_id` (`UNIQUE(user_id, quiz_id)`), `started_at DEFAULT now`, `submitted_at`, `status` (`in_progress`/`completed`), `total_questions/score/correct_answers/wrong_answers/skipped_questions` (default 0), `percentage NUMERIC(5,2)`, `rank`, `completed_at`, `time_taken` (seconds), **`total_marks` (copied from quiz on submit), `marks_obtained` (score scaled onto total_marks on submit)**, **`violations` (default 0), `flagged` (default false), `flag_reason`** (`07_quiz_attempt_proctoring.sql`).
- **`quiz_student_response`**: `id`, `attempt_id FK CASCADE`, `problem_id FK RESTRICT`, `answer JSONB`, `is_attempted`, `time_spent_seconds` (default 0, never written by current code), `UNIQUE(attempt_id, problem_id)` (`06_quiz_response_is_attempted.sql`).
- **`quiz_problems`**: `quiz_id FK`, `problem_statement/description`, `quiz_problem_type FK`, `question_number` (ordering), `explaination` (sic), `hint`, `difficulty FK`, `marks/negative_marks` (stored, unused in grading), `reference_notes/internal_comments` (never sent to students).
- **`quiz_problem_options`**: `problem_id FK`, `option_statement/description`, `matching_target`, `iscorrect`.
- **`quiz_participants`** (audience allow-list): `quiz_id, user_id` (`UNIQUE(quiz_id, user_id)`), `status` (`1` = allowed), `source`, `registered_at`. **Empty table = open access**; any rows = only `status = 1` users may register/start.

---

## 10. Key business rules (cheat-sheet)

1. One registration row exists per (user, quiz). Multiple historical attempts are allowed, but only one `in_progress` attempt may exist at a time.
2. Join/register create only the registration. The attempt and authoritative timer begin when exam mode starts.
3. Start resumes an `in_progress` attempt (refreshing `total_questions`); a `completed` attempt can never restart.
4. MCQs are auto-graded with configured marks/negative marks; text answers are stored for manual grading. Submit writes the full scorecard onto the attempt.
5. Exam-cell: 3 violations → `flagged` → frontend auto-submits; the flag and reason persist on the attempt and surface in the result/review for examiners.
6. Public problem endpoints never leak `iscorrect`, explanations, or hints; only the post-submit review exposes correct answers, and only to the attempt owner.
7. Leaderboard only lists `completed` attempts and is hidden unless the quiz enables it (owner always sees it).

Related docs: `QUIZ_CREATION_FLOW.md` (creator side), `REGISTRATION_FLOW.md` (auth), `QUIZ_MODULE_BACKEND.md` (module overview), `connect_fe_be.md` (frontend↔backend wiring), `database/migrations/` (`01_quiz.sql`, `04_quiz_attempt.sql`, `05_quiz_registration_unique.sql`, `06_quiz_response_is_attempted.sql`, `07_quiz_attempt_proctoring.sql`).
