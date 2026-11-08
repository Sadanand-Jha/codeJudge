# Quiz Module Backend Documentation

## Overview
Complete backend implementation for the Quiz module, built following existing project architecture and conventions.

> Student-side companion docs:
> - `QUIZ_STUDENT_FLOW.md` — end-to-end student lifecycle and rules.
> - `QUIZ_STUDENT_CALL_MAP.md` — which frontend file calls which service/API and where it lands in the backend.

## Database Schema

### Core Tables
- `quiz` - Quiz metadata with status, visibility, difficulty, marks, leaderboard settings
- `quiz_problems` - Questions with type, explanation, hint, difficulty
- `quiz_problem_options` - MCQ/options with correctness flag
- `quiz_registration` - Legacy registration rows (student registration is currently disabled; see Join / Register)
- `quiz_attempt` - Quiz attempt tracking with scoring, timing, and proctoring flags
- `quiz_student_response` - Individual question responses (autosave + final submit)
- `quiz_rating` - One anonymous learner rating per completed attempt (quiz/question/platform/teacher + feedback)

### Supporting Tables
- `quiz_participants` - Audience allow-list (`status = 1` means eligible)
- `quiz_collaborator_request` - Quiz collaboration invitations
- `quiz_game_config`, `quiz_game_mechanics`, `quiz_game_events` - Live game configuration

### Reference Tables
- `quiz_problem_type` - Question types (single_choice, multiple_choice, true_false, text, etc.)
- `quiz_difficulty` - Difficulty levels
- `quiz_visibility` - Visibility settings
- `quiz_status` - Quiz lifecycle status lookup

### Key Columns
**quiz table:**
- `status` - draft/published/archived (resolved through `quiz_status`)
- `visibility` - FK to quiz_visibility
- `difficulty` - FK to quiz_difficulty
- `total_marks`, `passing_marks`
- `shuffle_questions`, `shuffle_options`
- `negative_marking`, `leaderboard`

**quiz_attempt table:**
- `score`, `percentage`, `rank`
- `status` - in_progress/completed/timed_out
- `time_taken`, `total_questions`
- `correct_answers`, `wrong_answers`, `skipped_questions`
- `started_at`, `last_heartbeat_at`, `registration_data`
- `violations`, `flagged`, `flag_reason` - exam-cell proctoring

**quiz_rating table:**
- `quiz_id`, `user_id`, `attempt_id`
- `rating`, `question_rating`, `platform_rating`, `teacher_rating`
- `feedback` (optional)

---

## Architecture

### Layer Structure
```
routes → controller → service → repository → database
```

### Files
- `src/routes/v1/user/quiz.routes.ts` - Route definitions with validation
- `src/controllers/quiz.controller.ts` - Request handlers
- `src/services/database/quiz.service.ts` - Business logic
- `src/repositories/quiz.repository.ts` - Data access
- `src/services/quizSubmission.service.ts` - Async grading processor
- `src/queues/quizSubmission.queue.ts` - BullMQ/durable fallback submission queue
- `src/queues/quizSubmission.worker.ts` - Grading worker
- `src/middleware/validate.ts` - Zod validation schemas

---

## API Routes

### Base Path
All routes are prefixed with `/api/v1/user/quiz`

### Authentication
All routes require authentication via `authenticate` middleware.

---

## 1. Quiz Settings

### GET /api/v1/user/quiz
Get all quizzes with filters, search, sorting, pagination

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string) - Search in name/code
- `status` (string) - draft/published/archived
- `visibility` (number)
- `difficulty` (number)
- `sortBy` (string) - created_at/starttime/endtime/total_marks
- `sortOrder` (string) - ASC/DESC

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Quiz Name",
      "code": "ABC123XYZ4567890",
      "createdby": 1,
      "starttime": "2025-01-01T00:00:00.000Z",
      "endtime": "2025-01-02T00:00:00.000Z",
      "visibility": 1,
      "difficulty": 1,
      "total_marks": 100,
      "passing_marks": 40,
      "shuffle_questions": false,
      "shuffle_options": false,
      "Show_Results_Immediately": true,
      "negative_marking": false,
      "leaderboard": true,
      "status": "published",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "creator_name": "john_doe",
      "visibility_name": "Global",
      "difficulty_name": "Medium",
      "participants": 50,
      "total_questions": 20,
      "completion_rate": 75.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### GET /api/v1/user/quiz/:quizId
Get single quiz by ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Quiz Name",
    "code": "ABC123XYZ4567890",
    "createdby": 1,
    "starttime": "2025-01-01T00:00:00.000Z",
    "endtime": "2025-01-02T00:00:00.000Z",
    "visibility": 1,
    "difficulty": 1,
    "total_marks": 100,
    "passing_marks": 40,
    "shuffle_questions": false,
    "shuffle_options": false,
    "Show_Results_Immediately": true,
    "negative_marking": false,
    "leaderboard": true,
    "status": "published",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "creator_name": "john_doe",
    "visibility_name": "Global",
    "difficulty_name": "Medium"
  }
}
```

### GET /api/v1/user/quiz/code/:code
Get quiz by code

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Quiz Name",
    "code": "ABC123XYZ4567890",
    "createdby": 1,
    "starttime": "2025-01-01T00:00:00.000Z",
    "endtime": "2025-01-02T00:00:00.000Z",
    "visibility": 1,
    "difficulty": 1,
    "total_marks": 100,
    "passing_marks": 40,
    "shuffle_questions": false,
    "shuffle_options": false,
    "Show_Results_Immediately": true,
    "negative_marking": false,
    "leaderboard": true,
    "status": "published",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z",
    "creator_name": "john_doe",
    "visibility_name": "Global",
    "difficulty_name": "Medium"
  }
}
```

### POST /api/v1/user/quiz
Create new quiz

**Request Body:**
```json
{
  "name": "Quiz Name",
  "code": "ABC123XYZ4567890",
  "starttime": "2025-01-01T00:00:00.000Z",
  "endtime": "2025-01-02T00:00:00.000Z",
  "visibility": 1,
  "difficulty": 1,
  "totalMarks": 100,
  "passingMarks": 40,
  "shuffleQuestions": false,
  "shuffleOptions": false,
  "showResultsImmediately": true,
  "negativeMarking": false,
  "leaderboard": true
}
```

**Validation:**
- `name`: 3-100 characters, required
- `code`: 16-64 characters, required
- `starttime`, `endtime`: optional ISO date strings
- `visibility`, `difficulty`: optional positive integers
- `totalMarks`, `passingMarks`: optional non-negative numbers
- `shuffleQuestions`, `shuffleOptions`, `showResultsImmediately`, `negativeMarking`, `leaderboard`: optional booleans

**Success Response (201):**
```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "id": 1,
    "name": "Quiz Name",
    "code": "ABC123XYZ4567890",
    "createdby": 1,
    "starttime": "2025-01-01T00:00:00.000Z",
    "endtime": "2025-01-02T00:00:00.000Z",
    "visibility": 1,
    "difficulty": 1,
    "total_marks": 100,
    "passing_marks": 40,
    "shuffle_questions": false,
    "shuffle_options": false,
    "Show_Results_Immediately": true,
    "negative_marking": false,
    "leaderboard": true,
    "status": "draft",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/v1/user/quiz/:quizId
Update quiz

**Request Body:** Same as create

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz updated successfully",
  "data": {
    "id": 1,
    "name": "Updated Quiz Name",
    "code": "ABC123XYZ4567890",
    "createdby": 1,
    "starttime": "2025-01-01T00:00:00.000Z",
    "endtime": "2025-01-02T00:00:00.000Z",
    "visibility": 1,
    "difficulty": 1,
    "total_marks": 100,
    "passing_marks": 40,
    "shuffle_questions": false,
    "shuffle_options": false,
    "Show_Results_Immediately": true,
    "negative_marking": false,
    "leaderboard": true,
    "status": "published",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not quiz owner
- `404` - Quiz not found

### DELETE /api/v1/user/quiz/:quizId
Delete quiz

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz deleted successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not quiz owner
- `404` - Quiz not found

### POST /api/v1/user/quiz/:quizId/clone
Clone quiz

**Request Body:**
```json
{
  "name": "Cloned Quiz Name",
  "code": "NEWCODE1234567890"
}
```

**Validation:**
- `name`: 3-100 characters, required
- `code`: 16-64 characters, required

**Success Response (201):**
```json
{
  "success": true,
  "message": "Quiz cloned successfully",
  "data": {
    "id": 2,
    "name": "Cloned Quiz Name",
    "code": "NEWCODE1234567890",
    "createdby": 1,
    "starttime": "2025-01-01T00:00:00.000Z",
    "endtime": "2025-01-02T00:00:00.000Z",
    "visibility": 1,
    "difficulty": 1,
    "total_marks": 100,
    "passing_marks": 40,
    "shuffle_questions": false,
    "shuffle_options": false,
    "Show_Results_Immediately": true,
    "negative_marking": false,
    "leaderboard": true,
    "status": "draft",
    "created_at": "2025-01-02T00:00:00.000Z",
    "updated_at": "2025-01-02T00:00:00.000Z"
  }
}
```

### PATCH /api/v1/user/quiz/:quizId/status
Update quiz status

**Request Body:**
```json
{
  "status": "published"
}
```

**Validation:**
- `status`: enum - published/unpublished/draft/archived

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz published successfully",
  "data": {
    "id": 1,
    "status": "published",
    ...
  }
}
```

---

## 2. Question Management

### GET /api/v1/user/quiz/:quizId/problems
Get all problems for a quiz

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "quiz_id": 1,
      "problem_statement": "What is 2+2?",
      "problem_description": "Simple arithmetic question",
      "quiz_problem_type": 1,
      "problem_type_name": "single_choice",
      "question_number": 1,
      "explaination": "2+2 equals 4",
      "hint": "Think basic math",
      "difficulty": 1,
      "reference_notes": null,
      "internal_comments": null,
      "difficulty_name": "Easy",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "options": [
        {
          "id": 1,
          "problem_id": 1,
          "option_statement": "4",
          "option_description": null,
          "iscorrect": true,
          "created_at": "2025-01-01T00:00:00.000Z",
          "updated_at": "2025-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### GET /api/v1/user/quiz/:quizId/problems/public
Student-safe problem list. Requires `checkQuizAccess`; drops `explaination`, `hint`, `reference_notes`, `internal_comments` from every problem and `iscorrect` from every option.

- `200 { success, data: [...] }`
- `403 Quiz access denied` when the caller is not eligible.

### POST /api/v1/user/quiz/:quizId/problems
Add question

**Request Body:**
```json
{
  "problem_statement": "What is 2+2?",
  "problem_description": "Simple arithmetic",
  "quiz_problem_type": 1,
  "question_number": 1,
  "explanation": "2+2 equals 4",
  "hint": "Think basic math",
  "difficulty": 1,
  "reference_notes": "Chapter 1",
  "internal_comments": "Easy question"
}
```

**Validation:**
- `problem_statement`: 1-2000 chars, required
- `problem_description`: max 5000 chars
- `quiz_problem_type`: positive integer
- `question_number`: positive integer
- `explanation`: max 2000 chars
- `hint`: max 500 chars
- `difficulty`: positive integer
- `reference_notes`: max 2000 chars
- `internal_comments`: max 1000 chars

**Success Response (201):**
```json
{
  "success": true,
  "message": "Question added successfully",
  "data": {
    "id": 1,
    "quiz_id": 1,
    "problem_statement": "What is 2+2?",
    "problem_description": "Simple arithmetic",
    "quiz_problem_type": 1,
    "question_number": 1,
    "explaination": "2+2 equals 4",
    "hint": "Think basic math",
    "difficulty": 1,
    "reference_notes": "Chapter 1",
    "internal_comments": "Easy question",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/v1/user/quiz/problems/:problemId
Update question

**Request Body:** Same as add question

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    "id": 1,
    "quiz_id": 1,
    "problem_statement": "Updated question?",
    ...
  }
}
```

### DELETE /api/v1/user/quiz/problems/:problemId
Delete question

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

### POST /api/v1/user/quiz/problems/:problemId/duplicate
Duplicate question

**Success Response (201):**
```json
{
  "success": true,
  "message": "Question duplicated successfully",
  "data": {
    "id": 2,
    "quiz_id": 1,
    "problem_statement": "What is 2+2?",
    "question_number": 2,
    ...
  }
}
```

### PUT /api/v1/user/quiz/:quizId/reorder
Reorder questions

**Request Body:**
```json
{
  "problemIds": [3, 1, 2]
}
```

**Validation:**
- `problemIds`: array of positive integers, min 1 item

**Success Response (200):**
```json
{
  "success": true,
  "message": "Questions reordered successfully"
}
```

### POST /api/v1/user/quiz/problems/:problemId/options
Add option to question

**Request Body:**
```json
{
  "option_statement": "4",
  "option_description": "The correct answer",
  "isCorrect": true
}
```

**Validation:**
- `option_statement`: 1-1000 chars, required
- `option_description`: max 2000 chars
- `isCorrect`: boolean, required

**Success Response (201):**
```json
{
  "success": true,
  "message": "Option added successfully",
  "data": {
    "id": 1,
    "problem_id": 1,
    "option_statement": "4",
    "option_description": "The correct answer",
    "iscorrect": true,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 3. Quiz Attempt

### POST /api/v1/user/quiz/:quizId/start
Start quiz attempt

**Success Response (201):**
```json
{
  "success": true,
  "message": "Quiz started successfully",
  "data": {
    "attempt": {
      "id": 1,
      "user_id": 1,
      "quiz_id": 1,
      "score": 0,
      "percentage": 0,
      "rank": null,
      "status": "in_progress",
      "completed_at": null,
      "time_taken": null,
      "total_questions": 20,
      "correct_answers": 0,
      "wrong_answers": 0,
      "skipped_questions": 0,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    },
    "problems": [
      {
        "id": 1,
        "quiz_id": 1,
        "problem_statement": "What is 2+2?",
        "problem_description": null,
        "quiz_problem_type": 1,
        "problem_type_name": "single_choice",
        "question_number": 1,
        "explaination": null,
        "hint": null,
        "difficulty": 1,
        "reference_notes": null,
        "internal_comments": null,
        "difficulty_name": "Easy",
        "created_at": "2025-01-01T00:00:00.000Z",
        "updated_at": "2025-01-01T00:00:00.000Z",
        "options": [
          {
            "id": 1,
            "problem_id": 1,
            "option_statement": "4",
            "option_description": null,
            "iscorrect": true,
            "created_at": "2025-01-01T00:00:00.000Z",
            "updated_at": "2025-01-01T00:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

**Resume Response (200):**
```json
{
  "success": true,
  "message": "Resuming existing quiz attempt",
  "data": {
    "attempt": { "id": 1, "status": "in_progress", "...": "..." },
    "problems": [],
    "savedResponses": [],
    "remainingSeconds": 1200
  }
}
```

Notes:
- Starting resumes the single `in_progress` attempt (refresh-safe, timer continues).
- Question and option order is shuffled with a stable per-attempt seed.
- Correct-answer flags, explanations, hints, and reference notes are stripped from the student payload.
- `quiz_participants` acts as an allow-list only when `audience_mode = 'classroom'` and the list is non-empty.

**Error Responses:**
- `400` - Quiz has no questions
- `403` - Quiz not live, outside time window, audience denied, or reattempt cap reached
  (`data.attemptsMade` / `data.maxAttempts` are returned for the cap)

### GET /api/v1/user/quiz/:quizId/attempt-registration
Returns whether the caller already has an in-progress attempt (so the registration form can be skipped on refresh/resume) and the stored `registration_data`.

```json
{
  "success": true,
  "data": {
    "hasActiveAttempt": true,
    "registrationData": { "studentName": "Asha", "rollNo": "R001" }
  }
}
```

### POST /api/v1/user/quiz/attempt/:attemptId/heartbeat
Called every ~25 seconds by the exam page. Validates attempt ownership and deadlines, then updates `quiz_attempt.last_heartbeat_at` via `touchQuizAttempt` so the creator's live view only shows genuinely active students.

- `200 { success: true }`
- `404 Active quiz attempt not found`
- `409 Quiz time has expired`

### POST /api/v1/user/quiz/attempt/:attemptId/violation
Records one exam-cell proctoring event. The client reports one event per episode: `tab_switch`, `window_blur`, `fullscreen_exit`, `copy_attempt`, `cut_attempt`, `paste_attempt`.

- Body: `{ type: string }` (1–50 chars)
- `violations = stored + 1`; `flagged = violations >= 3`; `flag_reason` appends `"<type>#<n>"`.
- `200 { success, data: { violations, flagged, maxAllowed: 3 } }`
- `404 Quiz attempt not found`; `400 Attempt is no longer active`

### POST /api/v1/user/quiz/attempt/:attemptId/save
Autosave answer

**Request Body:**
```json
{
  "problemId": 1,
  "option": "1",
  "textAnswer": "Some text answer",
  "timeTaken": 30
}
```

**Validation:**
- `problemId`: positive integer, required
- `option`: optional string
- `textAnswer`: optional string
- `timeTaken`: non-negative integer

**Success Response (200):**
```json
{
  "success": true,
  "message": "Response saved successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "problem_id": 1,
    "option": "1",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### POST /api/v1/user/quiz/attempt/:attemptId/submit
Submit quiz with batch responses

**Request Body:**
```json
{
  "responses": [
    {
      "problemId": 1,
      "option": "1",
      "textAnswer": "Some text answer"
    },
    {
      "problemId": 2,
      "option": "3"
    }
  ]
}
```

**Validation:**
- `responses`: array of response objects, required
- Each response:
  - `problemId`: positive integer, required
  - `option`: optional string (for MCQ/options)
  - `textAnswer`: optional string (for text/integer answers)

**Important Notes:**
- Only answered questions should be included in the responses array; skipped questions are omitted.
- The body may also include `violations`, `flagged`, and `flagReason` as a fallback if live violation reports failed.
- Grading is **asynchronous**. The intake path only validates ownership/shape, stores a durable fallback copy, and enqueues a BullMQ job (or a Redis-backed fallback when no worker is live).
- The worker (`src/services/quizSubmission.service.ts`) re-checks ownership, deadlines, and attempt state before grading and persisting the scorecard.
- Client flow: submit → poll `submit-status` → navigate to results when `status === "completed"`.

**Accepted Response (202):**
```json
{
  "success": true,
  "message": "Submission queued for grading",
  "data": { "attemptId": 1, "jobId": "42", "status": "queued" }
}
```

A repeat submit after the job completed returns `200` with the graded attempt.

**Error Responses:**
- `400` - Invalid request (responses must be an array / invalid attempt id)
- `401` - Unauthorized
- `500` - Internal error while queuing

### GET /api/v1/user/quiz/attempt/:attemptId/submit-status
Poll async grading status: `queued | processing | completed | failed`.

```json
{
  "success": true,
  "data": {
    "attemptId": 1,
    "status": "completed",
    "attempt": { "id": 1, "score": 15, "percentage": 75.5, "status": "completed" }
  }
}
```

- On `failed`, `data.error` carries the worker error.
- The endpoint also runs the durable fallback/controlled recovery path when BullMQ is unavailable.
- Ownership is enforced; a job belonging to another user returns `404`.

---

## 4. Results & Review

### GET /api/v1/user/quiz/result/:attemptId
Get quiz result

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "quiz_id": 1,
    "score": 15,
    "percentage": 75.5,
    "rank": 3,
    "status": "completed",
    "completed_at": "2025-01-01T00:30:00.000Z",
    "time_taken": 1200,
    "total_questions": 20,
    "correct_answers": 15,
    "wrong_answers": 3,
    "skipped_questions": 2,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:30:00.000Z",
    "name": "Quiz Name",
    "code": "ABC123XYZ4567890",
    "total_marks": 100,
    "passing_marks": 40
  }
}
```

### GET /api/v1/user/quiz/result/:attemptId/review
Get question-wise review

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "problem_id": 1,
      "question_number": 1,
      "problem_statement": "What is 2+2?",
      "problem_description": null,
      "explaination": "2+2 equals 4",
      "hint": "Think basic math",
      "problem_type": "single_choice",
      "correct_answer": "4",
      "selected_option": "4",
      "answered_at": "2025-01-01T00:05:00.000Z"
    }
  ]
}
```

---

## 5. Leaderboard

### GET /api/v1/user/quiz/:quizId/leaderboard
Get quiz leaderboard

**Query Parameters:**
- `userId` (optional) - Filter for specific user

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "username": "john_doe",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_id": 1,
      "avatar_url": "/api/v1/avatars/1",
      "college_name": "ABC College",
      "score": 95,
      "percentage": 95.0,
      "rank": 1,
      "time_taken": 600,
      "completed_at": "2025-01-01T00:10:00.000Z",
      "status": "completed",
      "correct_answers": 19,
      "wrong_answers": 1,
      "skipped_questions": 0
    }
  ]
}
```

**Error Response:**
- `403` - Leaderboard disabled and user is not creator/admin

### GET /api/v1/user/quiz/:quizId/crowd
Avatar-only presence list for the join/waiting background. Returns one row per student who has attempted or is attempting the quiz.

```json
{
  "success": true,
  "data": [
    { "avatarUrl": "/api/v1/avatars/1", "status": "attempting" },
    { "avatarUrl": null, "status": "submitted" }
  ]
}
```

No names, ranks, scores, or other user details are exposed.

---

## 6. Ratings, Crowd & Public Creator Card

### GET /api/v1/user/quiz/:quizId/rating
Returns the caller's rating eligibility plus anonymous aggregates. `quizId` may be the numeric id or the 16-character code.

```json
{
  "success": true,
  "data": {
    "averageRating": 4.6,
    "averageQuestionRating": 4.5,
    "averagePlatformRating": 4.8,
    "averageTeacherRating": 4.7,
    "ratingCount": 32,
    "userRating": null,
    "reason": "eligible"
  }
}
```

`reason` is `eligible | already_rated | no_completed_attempt`. Ratings are immutable and only students with a completed attempt can submit them.

### POST /api/v1/user/quiz/:quizId/rating
Submit one rating (1–5) for quiz/questions/platform/teacher plus optional feedback.

- `201` created; `409` already rated; `403` no completed attempt; `404` quiz not found.
- Identity and individual ratings are never exposed through the public aggregate endpoints.

### GET /api/v1/user/quiz/creator/:creatorId/stats
Public, aggregate-only creator card used on the join page and the joined-room screen.

```json
{
  "success": true,
  "data": {
    "username": "asha",
    "displayName": "Asha Verma",
    "avatarUrl": "/api/v1/avatars/3",
    "bio": "CS educator",
    "country": "India",
    "college": "ABC College",
    "isVerified": true,
    "memberSince": "2024-06-01T00:00:00.000Z",
    "rating": 4.8,
    "maxRating": 5,
    "quizzesCreated": 12,
    "uniqueStudents": 340,
    "totalAttempts": 900,
    "averageTeacherRating": 4.7,
    "teacherRatingCount": 58
  }
}
```

Privacy contract: **no email, mobile, password, address, or internal user id** is ever returned. Only public profile fields, aggregate counts, and anonymous rating averages. The route still requires authentication like every `/api/v1/user/quiz` route — “public” here means non-private fields, not an anonymous endpoint.

---

## 7. Analytics

### GET /api/v1/user/quiz/:quizId/analytics
Get quiz analytics (creator only)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_attempts": 50,
      "average_score": 72.5,
      "highest_score": 100,
      "lowest_score": 20,
      "average_completion_time": 1200,
      "completion_rate": "85.50",
      "total_registrations": 100
    },
    "question_stats": [
      {
        "id": 1,
        "question_number": 1,
        "problem_statement": "What is 2+2?",
        "problem_type": "single_choice",
        "difficulty": 1,
        "difficulty_name": "Easy",
        "total_attempts": 50,
        "total_responses": 48,
        "correct_responses": 40
      }
    ]
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not quiz owner

---

## 8. Dashboard APIs

### GET /api/v1/user/quiz/my
Get user's quiz registrations

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Quiz Name",
      "code": "ABC123XYZ4567890",
      "starttime": "2025-01-01T00:00:00.000Z",
      "endtime": "2025-01-02T00:00:00.000Z",
      "total_marks": 100,
      "passing_marks": 40,
      "leaderboard": true,
      "status": "published",
      "visibility": 1,
      "visibility_name": "Global",
      "is_registered": true,
      "rollno": "R001",
      "registered_at": "2025-01-01T00:00:00.000Z",
      "attempt_id": 1,
      "score": 75,
      "percentage": 75.0,
      "rank": 3,
      "attempt_status": "completed",
      "completed_at": "2025-01-01T00:30:00.000Z",
      "time_taken": 1200,
      "total_questions": 20,
      "correct_answers": 15,
      "wrong_answers": 3,
      "skipped_questions": 2
    }
  ]
}
```

### GET /api/v1/user/quiz/previous
Get previous quizzes (attempted by student)

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string)
- `sortBy` (string) - completed_at/score/percentage/time_taken
- `sortOrder` (string) - ASC/DESC

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "attempt_id": 1,
      "quiz_id": 1,
      "name": "Quiz Name",
      "code": "ABC123XYZ4567890",
      "total_marks": 100,
      "passing_marks": 40,
      "score": 75,
      "percentage": 75.0,
      "rank": 3,
      "status": "completed",
      "completed_at": "2025-01-01T00:30:00.000Z",
      "time_taken": 1200,
      "total_questions": 20,
      "correct_answers": 15,
      "wrong_answers": 3,
      "skipped_questions": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### POST /api/v1/user/quiz/register
Legacy registration endpoint.

**Request Body:**
```json
{
  "quizId": 1,
  "rollno": "R001"
}
```

**Validation:**
- `quizId`: positive integer, required
- `rollno`: max 50 chars, optional
- `.strict()` — no extra keys

**Current behaviour (registration temporarily disabled):**
- Access is still validated (`checkQuizAccessForRegistration`), but no `quiz_registration` row is created.
- `200 { success: true, message: "Registration is not required for this quiz", data: null }`
- `403 <reason>` when the quiz is unavailable, ended, or the classroom audience excludes the caller.

`DELETE /api/v1/user/quiz/register/:quizId` remains for legacy clients; it refuses while an attempt is `in_progress`.

### POST /api/v1/user/quiz/join
Join a quiz by 16-character code with access validation.

**Request Body:**
```json
{ "code": "ABC123XYZ4567890" }
```

**Validation:**
- `code`: `/^[A-Za-z]{16}$/`, normalized to uppercase, required
- `.strict()` — no extra keys (do not send `quizId`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz is ready to join",
  "data": {
    "quiz": {
      "id": 1,
      "code": "ABC123XYZ4567890",
      "name": "Quiz Name",
      "starttime": "2025-01-01T00:00:00.000Z",
      "endtime": "2025-01-02T00:00:00.000Z",
      "duration": 30,
      "total_marks": 100,
      "passing_marks": 40,
      "difficulty": 1,
      "status": "live"
    },
    "registration": null,
    "attempt": null
  }
}
```

`quiz` is the student-safe DTO (`toStudentQuiz`); owner internals and correctness data are never returned. Joining never silently registers a student — the attempt is created only when exam mode starts.

**Error Responses:**
- `400` - Invalid/missing code
- `403` - Quiz unavailable, ended, or audience denied
- `404` - Quiz not found

---

## Authentication & Authorization

### Authentication
- All routes use `authenticate` middleware
- Verifies `session_token` cookie
- Checks Redis blacklist
- Attaches `req.user` with `userId`, `adminId`, `email`
- Session tokens are JWT-based with configurable expiry (default: 10 days)
- Login sets httpOnly cookie named `session_token`

### Session Management
- `/api/auth/me` endpoint checks for session_token from cookie or request body
- If no token provided, returns `200` with `{ success: false, message: "Session ended" }`
- Frontend should handle this by redirecting to login page
- Logout blacklists token in Redis for remaining TTL

### Authorization
- Quiz owners can edit/delete/publish/archive their quizzes
- Only quiz owners can view analytics
- Leaderboard visibility respects quiz settings
- Students can only access quizzes they're registered for
- Admins bypass restrictions (where applicable)

### Error Responses
- `200` with `success: false` - Session ended (no token provided)
- `401` - Invalid/expired token or unauthorized access
- `403` - Forbidden (insufficient permissions)

---

## Validation

### Zod Schemas
- `quizSchema` - Create/update quiz
- `quizStatusSchema` - Status updates
- `quizRegistrationSchema` - Registration
- `quizProblemSchema` - Questions
- `quizProblemOptionSchema` - Options
- `reorderQuizProblemsSchema` - Reorder
- `saveQuizResponseSchema` - Autosave
- `cloneQuizSchema` - Clone quiz
- `joinQuizSchema` - Join quiz

All schemas sanitize input and return meaningful error messages.

---

## Error Handling

### Global Error Handler
All errors return consistent JSON format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request (validation)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict (already registered)
- `500` - Internal server error

---

## Transactions

Used for:
- Cloning quizzes (copy quiz + problems + options)
- Reordering questions
- Submitting quizzes (update attempt + calculate score)

All transactions use PostgreSQL with proper rollback on errors.

---

## Performance

### Indexes
- `idx_quiz_code` - Quiz code lookups
- `idx_quiz_problems_quiz_id` - Problem queries
- `idx_quiz_registration_quiz_id`, `idx_quiz_registration_user_id` - Registration checks
- `idx_quiz_attempts_user_id`, `idx_quiz_attempts_quiz_id`, `idx_quiz_attempts_status` - Attempt queries
- `idx_qsr_user_id`, `idx_qsr_problem_id` - Response lookups

### Query Optimization
- JOINs for related data (visibility, difficulty, creator)
- COUNT for pagination in single query
- Avoided N+1 queries in leaderboard/analytics

---

## Frontend Integration

### Service File
`code-judge-frontend/src/services/quiz.ts` contains all API functions with TypeScript types.

### Key Functions
```typescript
// Quiz CRUD
createQuiz(data)
updateQuiz(quizId, data)
deleteQuiz(quizId)
cloneQuiz(quizId, data)
updateQuizStatus(quizId, status)

// Questions
addQuizProblem(quizId, data)
updateQuizProblem(problemId, data)
deleteQuizProblem(problemId)
duplicateQuizProblem(problemId)
reorderQuizProblems(quizId, problemIds)
addQuizProblemOption(problemId, data)

// Attempts (student)
startQuizAttempt(quizId, registration?)
getAttemptRegistrationState(quizId)
saveQuizResponse(attemptId, data)
heartbeatQuizAttempt(attemptId)
reportViolation(attemptId, type)
submitQuizAttempt(attemptId, responses, proctor?)
getSubmitStatus(attemptId)

// Results / review (student)
getQuizResult(attemptId)
getQuizReview(attemptId)

// Ratings / public creator card (student)
getQuizRating(quizId)
submitQuizRating(quizId, submission)
getCreatorStats(creatorId)
getQuizCrowdAvatars(quizId)

// Dashboard / discovery (student)
getMyQuizzes()
getOldQuizzes(params)          // GET /old-quizzes (alias of /previous)
getPreviousQuizzes(params)
getQuizByCode(code)
joinQuiz({ code })             // legacy; join page navigates straight to /waiting
registerForQuiz(quizId, rollno) // legacy; backend currently returns data: null

// Analytics (creator)
getQuizAnalytics(quizId)

// Creator CRUD / questions (not student-side)
getAllQuizzes()
getQuizById(id)
getQuizProblems(quizId)
createQuiz(data)
updateQuiz(quizId, data)
deleteQuiz(quizId)
cloneQuiz(quizId, data)
updateQuizStatus(quizId, status)
addQuizProblem(quizId, data)
updateQuizProblem(problemId, data)
deleteQuizProblem(problemId)
duplicateQuizProblem(problemId)
reorderQuizProblems(quizId, problemIds)
addQuizProblemOption(problemId, data)

// Leaderboard
getQuizLeaderboard(quizId)
getQuizLeaderboardSettings(quizId)   // stale frontend helper: no backend /leaderboard/settings route
updateQuizLeaderboardSettings(quizId, settings) // stale frontend helper

// Result Generation (creator only)
generateQuizResults(quizId, options?)
retryQuizResultsEmail(quizId)
```

For the exact frontend-file → service → controller → repository mapping, see `QUIZ_STUDENT_CALL_MAP.md`.

---

## Testing Checklist

- [ ] Create quiz with all fields
- [ ] Update quiz settings
- [ ] Change quiz status (draft → published → archived)
- [ ] Clone quiz with questions and options
- [ ] Delete quiz
- [ ] Add/update/delete/reorder questions
- [ ] Add options with correct answers
- [ ] Legacy register returns `data: null` (registration disabled)
- [ ] Join quiz by code returns the student-safe DTO
- [ ] Start quiz attempt (create + resume)
- [ ] `attempt-registration` reflects the active attempt
- [ ] Autosave responses
- [ ] Heartbeat updates `last_heartbeat_at`
- [ ] 3rd proctoring violation flags the attempt
- [ ] Async submit returns `202 queued` and `submit-status` reaches `completed`
- [ ] View result
- [ ] View question-wise review
- [ ] Submit one rating; second rating returns `409`
- [ ] Public creator stats contain no personal info (email/mobile/password)
- [ ] Crowd endpoint is avatar-only
- [ ] View leaderboard
- [ ] View analytics (creator only)
- [ ] Filter/search/sort/paginate quizzes
- [ ] View previous quizzes (`/previous` and `/old-quizzes`)
- [ ] Test authorization (non-owner cannot edit)
- [ ] Test validation (invalid inputs)

---

## Notes

- All timestamps use ISO 8601 format
- Database uses PostgreSQL with parameterized queries
- Transactions ensure data consistency
- Mock data should be replaced with API calls in production
- Frontend types in `services/quiz.ts` match backend responses
- Student payloads never include `iscorrect`, explanations, hints, reference notes, or other students' personal data
- Creator public stats are aggregate/profile-only and must never expose email, mobile, password, address, or internal user ids
- Submission grading is asynchronous; clients must poll `GET /attempt/:attemptId/submit-status`

---

## Anti-Copy Protection

### Overview
Client-side deterrents to discourage students from copying quiz content. These are UX deterrents only and NOT security boundaries.

### Implementation

**File:** `src/utils/quizAntiCopy.ts`

**Applied in:** `src/app/(app)/quiz/[quizId]/attempt/page.tsx`

### Features

**1. Disable Text Selection**
- Applies `user-select: none` to protected content
- Only affects quiz content, not inputs/textboxes
- CSS injected dynamically

**2. Disable Copy**
- Prevents Ctrl+C / Cmd+C
- Blocks copy event
- Prevents right-click → Copy

**3. Disable Context Menu**
- Prevents right-click menu inside quiz area
- Does not affect global context menu

**4. Disable Drag**
- Prevents dragging question text
- Prevents dragging images

**5. Disable Keyboard Shortcuts**
- Blocks: Ctrl/Cmd + C, X, A, S, P
- Allows typing in input fields
- macOS Meta key support

**6. Tab Switch Detection**
- Detects when student switches tabs
- Logs tab inactivity
- Can be extended to pause quiz

**7. Dynamic Watermark**
- Displays: username | roll number | quiz code | timestamp
- Rendered behind content with 6% opacity
- Rotated -30 degrees diagonally
- Difficult to remove from screenshots

**8. Anti-Print**
- Prevents Ctrl+P / Cmd+P
- Does not affect system print dialogs triggered outside browser

### Usage

```typescript
import {
  disableTextSelection,
  enableTextSelection,
  disableCopy,
  disableContextMenu,
  disableDragStart,
  disableKeyboardShortcuts,
  disablePrint,
  handleVisibilityChange,
  injectWatermarkStyles,
  removeWatermarkStyles,
} from "@/utils/quizAntiCopy";

// Enable protection
useEffect(() => {
  disableTextSelection();
  injectWatermarkStyles();
  
  document.addEventListener('copy', disableCopy);
  document.addEventListener('contextmenu', disableContextMenu);
  document.addEventListener('dragstart', disableDragStart);
  document.addEventListener('keydown', disableKeyboardShortcuts);
  document.addEventListener('keydown', disablePrint);
  
  return () => {
    enableTextSelection();
    removeWatermarkStyles();
    document.removeEventListener('copy', disableCopy);
    // ... cleanup
  };
}, []);
```

### Important Notes

- Only active during quiz attempt
- Does not affect dashboard, profile, or other pages
- Can be bypassed by screenshots/photographs
- Backend never sends sensitive data (hints, explanations, correct answers) before submission

---

## Manual Result Generation & Email Delivery

### Overview
Manual result generation system that allows quiz creators to generate results and email marksheets on demand. There are **no cron jobs or background schedulers** — results are generated only when the quiz creator explicitly clicks the "Generate Results & Email" button.

### Architecture

**Files:**
- `src/services/resultGeneration.service.ts` - Result generation service (evaluation, leaderboard, persistence, email)
- `src/services/marksheet.service.ts` - Excel marksheet generation
- `src/services/email.service.ts` - Email delivery service
- `src/controllers/quiz.controller.ts` - API controller (`generateQuizResults`, `retryQuizResultsEmail`)

### API Endpoints

**POST /api/v1/user/quiz/:quizId/generate-results**
- Manually generate results for a quiz (creator only)
- Body: `{ force?: boolean, sendEmail?: boolean }`
- Returns 409 if results already generated (unless `force: true`)

**POST /api/v1/user/quiz/:quizId/retry-email**
- Retry sending the marksheet email without recalculating results (creator only)

### Result Generation Flow

```
Creator clicks "Generate Results & Email"
  ↓
Show confirmation dialog
  ↓
POST /api/v1/user/quiz/:quizId/generate-results
  ↓
Check if results already exist (409 if not force)
  ↓
Fetch all completed submissions
  ↓
Evaluate every submission (reuse existing logic)
  ↓
Calculate marks, correct/wrong/unanswered, percentage
  ↓
Calculate ranks (leaderboard ordering)
  ↓
Persist all results in a transaction
  ↓
Generate Excel marksheet
  ↓
Email marksheet to creator only
  ↓
Return response (partial success if email fails)
```

### Duplicate Prevention

- If results have already been generated, the API returns `409` with `code: "RESULTS_ALREADY_GENERATED"`
- Frontend shows a "Regenerate Results?" confirmation dialog
- Passing `force: true` in the request body overwrites existing results

### Partial Success Handling

- If email sending fails, results are still saved in the database
- API returns `200` with `emailSent: false` and `emailError` message
- Creator can retry email sending via `POST /api/v1/user/quiz/:quizId/retry-email`
- Retry does NOT recalculate results — only regenerates marksheet and sends email

### Excel Marksheet

**Columns:**
1. Roll Number
2. Student Name
3. Username
4. Email
5. College
6. Quiz Name
7. Quiz Code
8. Attempt Date
9. Quiz Duration (min)
10. Time Taken (min)
11. Total Questions
12. Correct
13. Wrong
14. Skipped
15. Marks Obtained
16. Percentage
17. Rank

**Formatting:**
- Bold header row with pink background (#EC4899)
- Freeze header row
- Alternate row colors
- Center-aligned cells
- Auto-sized columns

**Sorting:**
- Sorted by roll number ascending (NULLS LAST)
- Falls back to username ascending

### Email Delivery

**To:** Quiz creator email only (NOT students)

**Subject:** `Quiz Report - <Quiz Name>`

**Body Includes:**
- Quiz details (name, code, end time)
- Statistics:
  - Total Participants
  - Total Submissions
  - Completion Rate
  - Average Score
  - Highest Score
  - Lowest Score
  - Average Time Taken
  - Highest Percentage

**Attachment:** Excel marksheet file

### Statistics Calculation

**Metrics:**
- `totalParticipants` - Completed attempts count
- `totalSubmissions` - Completed with status
- `completionRate` - submissions/participants * 100
- `averageMarks` - Mean of all scores
- `highestMarks` - Max score
- `lowestMarks` - Min score
- `averageTimeTaken` - Mean time in seconds
- `highestPercentage` - Max percentage

### Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Error Handling

**Email Failures:**
- Results remain saved in the database
- Partial success response returned
- Creator can retry email without recalculating

**Missing Data:**
- Graceful handling of NULL roll numbers
- Default values for missing fields
- Continues processing other students

### Performance

**Optimizations:**
- Batch database queries (no N+1)
- All student responses fetched in a single query
- All problems and options fetched in batch
- Transaction for bulk updates
- Single Excel generation per quiz
- Suitable for hundreds or thousands of submissions

---

## Quiz Submission Workflow

### Overview
The student attempt flow combines server-side autosave, a visible-page heartbeat, asynchronous grading, and a localStorage fallback. The database is authoritative; localStorage only bridges reloads/offline gaps.

### Client storage (fallback)
**File:** `src/lib/quizAttemptStorage.ts`

- `readQuizAttemptAnswers`, `writeQuizAttemptAnswers`, `clearQuizAttemptAnswers` keep per-attempt answers on the device.
- Stored answers are restored when the attempt page reloads before the server response arrives.
- Cleared after a successful submission/result handoff.

### Autosave (server first)
- MCQ selection triggers `POST /attempt/:attemptId/save` immediately.
- Text answers save on blur.
- The backend upserts one `quiz_student_response` row per `(attempt_id, problem_id)`, including `time_spent_seconds`.
- Clearing an answer sets `is_attempted = false`.
- Saves are rejected after the deadline; localStorage remains the offline fallback.

### Heartbeat and proctoring
- The attempt page calls `POST /attempt/:attemptId/heartbeat` every ~25 seconds while the document is visible.
- `touchQuizAttempt` updates `last_heartbeat_at`, so the creator's live view does not show closed tabs as active.
- Exam-cell violations are reported one per episode via `POST /attempt/:attemptId/violation` (`tab_switch`, `window_blur`, `fullscreen_exit`, `copy_attempt`, `cut_attempt`, `paste_attempt`).
- At 3 violations the attempt is flagged and the client auto-submits with the flag.

### Submit (async)
1. Student submits (button or timer expiry); the client sends the full answer set plus proctor fallback fields.
2. `POST /attempt/:attemptId/submit` validates ownership/shape and stores a durable fallback copy.
3. The job is enqueued in BullMQ; when no worker is live, a Redis-backed fallback is used.
4. The API responds `202 { status: "queued" }`.
5. The client polls `GET /attempt/:attemptId/submit-status` until `completed` or `failed`.
6. On completion the client navigates to `/quiz/{code}/results/{attemptId}`.

### Grading (worker)
**Files:** `src/services/quizSubmission.service.ts`, `src/queues/quizSubmission.worker.ts`

- Re-validates ownership, attempt state, and deadlines.
- Grades MCQs with configured per-question marks (or an equal share of `total_marks`); negative marking applies when enabled.
- Subjective answers are stored for manual grading.
- Persists every valid response (upsert), merges proctoring flags, computes `time_taken`, and writes the scorecard to `quiz_attempt`.
- Late submissions become `timed_out`.
- Duplicate submissions are prevented by checking the attempt status inside the worker.

### Failure handling
- Submission failures keep localStorage intact so the student can retry.
- Network drops are covered by server autosave plus the durable queued job.
- `submit-status` reports `failed` with an error message instead of silently losing the submission.
