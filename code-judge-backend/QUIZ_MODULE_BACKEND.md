# Quiz Module Backend Documentation

## Overview
Complete backend implementation for the Quiz module, built following existing project architecture and conventions.

## Database Schema

### Core Tables
- `quiz` - Quiz metadata with status, visibility, difficulty, marks, leaderboard settings
- `quiz_problems` - Questions with type, explanation, hint, difficulty
- `quiz_problem_options` - MCQ/options with correctness flag
- `quiz_registration` - User registrations for quizzes
- `quiz_attempts` - Quiz attempt tracking with scoring
- `quiz_student_response` - Individual question responses

### Reference Tables
- `quiz_problem_type` - Question types (single_choice, multiple_choice, true_false, text, etc.)
- `quiz_difficulty` - Difficulty levels
- `quiz_visibility` - Visibility settings

### Key Columns
**quiz table:**
- `status` - draft/published/archived
- `visibility` - FK to quiz_visibility
- `difficulty` - FK to quiz_difficulty
- `total_marks`, `passing_marks`
- `shuffle_questions`, `shuffle_options`
- `negative_marking`, `leaderboard`

**quiz_attempts table:**
- `score`, `percentage`, `rank`
- `status` - in_progress/completed/timed_out
- `time_taken`, `total_questions`
- `correct_answers`, `wrong_answers`, `skipped_questions`

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
    "id": 1,
    "user_id": 1,
    "quiz_id": 1,
    "status": "in_progress",
    ...
  }
}
```

**Error Responses:**
- `400` - Quiz has no questions
- `403` - Not registered, quiz not published, outside time window

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
- Only answered questions should be included in responses array
- Skipped questions should NOT be included
- Backend calculates score server-side
- Backend determines correct/wrong/skipped counts
- Transaction ensures data consistency

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
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
    "updated_at": "2025-01-01T00:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Invalid request / quiz already submitted
- `401` - Unauthorized
- `404` - Attempt not found

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

---

## 6. Analytics

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

## 7. Dashboard APIs

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
Register for quiz

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

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully registered for quiz",
  "data": {
    "id": 1,
    "user_id": 1,
    "quiz_id": 1,
    "is_registered": true,
    "rollno": "R001",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### POST /api/v1/user/quiz/join
Join quiz by code or ID with access validation

**Request Body:**
```json
{
  "code": "ABC123XYZ4567890"
}
```
OR
```json
{
  "quizId": 1
}
```

**Validation:**
- `code`: 16+ chars, optional
- `quizId`: positive integer, optional
- At least one required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined quiz",
  "data": {
    "quiz": {
      "id": 1,
      "name": "Quiz Name",
      "code": "ABC123XYZ4567890",
      ...
    },
    "registration": {
      "id": 1,
      "user_id": 1,
      "quiz_id": 1,
      "is_registered": true,
      ...
    }
  }
}
```

**Error Responses:**
- `400` - Neither code nor quizId provided
- `403` - Quiz not published, outside time window, not registered
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

// Attempts
startQuizAttempt(quizId)
saveQuizResponse(attemptId, data)
submitQuizAttempt(attemptId)

// Results
getQuizResult(attemptId)
getQuizReview(attemptId)

// Analytics
getQuizAnalytics(quizId)

// Dashboard
getAllQuizzes()
getMyQuizzes()
getPreviousQuizzes(params)
getQuizById(id)
getQuizByCode(code)
getQuizProblems(quizId)
registerForQuiz(quizId, rollno)
joinQuiz(data)

// Leaderboard
getQuizLeaderboard(quizId)
getQuizLeaderboardSettings(quizId)
updateQuizLeaderboardSettings(quizId, settings)
```

---

## Testing Checklist

- [ ] Create quiz with all fields
- [ ] Update quiz settings
- [ ] Change quiz status (draft → published → archived)
- [ ] Clone quiz with questions and options
- [ ] Delete quiz
- [ ] Add/update/delete/reorder questions
- [ ] Add options with correct answers
- [ ] Register for quiz
- [ ] Join quiz by code
- [ ] Start quiz attempt
- [ ] Autosave responses
- [ ] Submit quiz
- [ ] View result
- [ ] View question-wise review
- [ ] View leaderboard
- [ ] View analytics (creator only)
- [ ] Filter/search/sort/paginate quizzes
- [ ] View previous quizzes
- [ ] Test authorization (non-owner cannot edit)
- [ ] Test validation (invalid inputs)

---

## Notes

- All timestamps use ISO 8601 format
- Database uses PostgreSQL with parameterized queries
- Transactions ensure data consistency
- Mock data should be replaced with API calls in production
- Frontend types in `services/quiz.ts` match backend responses

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

## Automatic Marksheet Generation & Email Delivery

### Overview
Automatic marksheet generation system that triggers 2 minutes after quiz completion.

### Architecture

**Files:**
- `src/workers/quizReportWorker.ts` - Background worker for report generation
- `src/services/marksheet.service.ts` - Excel marksheet generation
- `src/services/email.service.ts` - Email delivery service

**Database Table:**
- `quiz_report_jobs` - Tracks report generation status

### Trigger Mechanism

**Cron Schedule:**
- Runs every 2 minutes via `node-cron`
- Checks for published quizzes with `endtime < NOW() - 2 minutes`
- Skips quizzes that already have report jobs

**Job Lifecycle:**
1. `pending` - Job created
2. `processing` - Generating marksheet and sending email
3. `completed` - Report sent successfully
4. `failed` - Error occurred (with error_message)

### Report Generation Flow

```
Worker runs every 2 minutes
  ↓
Find quizzes ready for report
  ↓
Create report job record
  ↓
Generate Excel marksheet
  ↓
Fetch creator email
  ↓
Send email with attachment
  ↓
Update job status to completed
```

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

**To:** Quiz creator email

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

**Retry Mechanism:**
- Worker processes failed jobs on next run
- Error logged with full stack trace
- No duplicate emails sent (job status prevents reprocessing)

### Statistics Calculation

**Dynamic Score Calculation:**
- Scores computed from stored responses
- No redundant data in database
- Consistent with leaderboard/results

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
- Job marked as failed
- Error message stored in database
- Retry on next worker iteration
- No duplicate reports

**Missing Data:**
- Graceful handling of NULL roll numbers
- Default values for missing fields
- Continues processing other students

### Performance

**Optimizations:**
- Batch queries (no N+1)
- Single Excel generation per quiz
- Async email sending
- Job deduplication prevents reprocessing

**Limits:**
- Worker runs every 2 minutes
- Processes one quiz at a time sequentially
- Suitable for typical quiz sizes

---

## Quiz Submission Workflow

### Overview
The quiz submission system is designed to prevent data loss and handle skipped questions correctly.

### Frontend localStorage Strategy

**Storage Key:** `quiz_progress_{quizId}`

**Stored Data:**
```typescript
{
  quizId: string;
  attemptId?: number;
  startedAt: string;
  currentQuestion: number;
  remainingTime?: number;
  responses: {
    [questionId]: {
      option?: string;
      textAnswer?: string;
    }
  }
}
```

**Key Principles:**
- Only answered questions exist in `responses` object
- Skipped questions have NO entry in localStorage
- Auto-save with 500ms debounce on every answer change
- No manual save button required
- Persistent across browser refresh/crash

### Auto-Save Implementation

**Debounced Save:**
- Triggers 500ms after last answer change
- Prevents excessive writes during rapid navigation
- Updates both React state and localStorage

**Answer Change Flow:**
1. Student selects/changes answer
2. Update React state immediately
3. Update progress object
4. Debounce save to localStorage (500ms)
5. Allow free navigation (no data loss)

### Batch Submission

**Single API Request:**
- All responses submitted at once via `POST /api/v1/user/quiz/attempt/:attemptId/submit`
- Request body: `{ responses: Array<{ problemId, option?, textAnswer? }> }`
- Backend calculates score server-side
- Backend determines correct/wrong/skipped counts
- Transaction ensures atomicity

**Skipped Questions Handling:**
- Only answered questions included in `responses` array
- Backend infers skipped questions by comparing total questions vs responses count
- No empty/null response rows inserted into database

### Timer Auto-Submission

**On Timer Expiry:**
1. Frontend automatically calls `handleSubmit()`
2. Reads all responses from localStorage
3. Submits batch to backend
4. Clears localStorage on success
5. Redirects to results page

**Behavior:**
- Identical to manual submit button
- No data loss due to timeout
- Student cannot prevent submission after expiry

### Crash Recovery

**On Page Load:**
1. Check localStorage for existing progress
2. If found with responses, resume from saved state
3. Restore:
   - Current question index
   - All answered questions
   - Remaining timer (if applicable)
4. Continue attempt seamlessly

**No Data Loss:**
- Progress saved before every state change
- Debounced saves prevent race conditions
- Failed submissions keep localStorage intact
- Retry allowed without losing answers

### Backend Batch Processing

**Validation:**
- Verify attempt ownership
- Check attempt not already completed
- Validate all problemIds belong to quiz

**Scoring:**
- Server-side calculation only
- Compare responses against correct options
- Count correct, wrong, and skipped
- Calculate percentage and rank

**Transaction:**
- Update quiz_attempts with final score
- Insert only non-skipped responses into quiz_student_response
- Commit on success, rollback on failure

### Frontend Implementation

**Key Files:**
- `src/utils/quizProgressStorage.ts` - localStorage utilities
- `src/app/(app)/quiz/[quizId]/attempt/page.tsx` - Quiz attempt page

**Key Functions:**
```typescript
// Initialize progress
initializeQuizProgress(quizId, attemptId)

// Save/Load/Clear
saveQuizProgress(progress)
loadQuizProgress(quizId)
clearQuizProgress(quizId)

// Update responses
updateResponse(progress, questionId, response)
removeResponse(progress, questionId) // for skips

// Batch submission
getResponsesArray(progress)

// Utilities
createDebouncedSave(500)
hasUnsavedProgress(quizId)
```

### Error Handling

**Submission Failures:**
- Keep localStorage intact
- Show error message
- Allow retry without data loss

**Network Errors:**
- Debounced saves queue automatically
- Progress preserved in localStorage
- Next load resumes from last save

**Duplicate Prevention:**
- Backend checks attempt status
- Reject if already completed
- Frontend disables submit button after attempt

### Performance

**Optimizations:**
- Debounced saves (500ms)
- Batch submission (single API call)
- No per-question API requests
- Minimal re-renders with React state

**Benefits:**
- Reduced network overhead
- Faster question navigation
- Reliable crash recovery
- No duplicate submissions

## Notes

- All timestamps use ISO 8601 format
- Database uses PostgreSQL with parameterized queries
- Transactions ensure data consistency
- Mock data should be replaced with API calls in production
- Frontend types in `services/quiz.ts` match backend responses

---

## Quiz Submission Workflow

### Overview
The quiz submission system is designed to prevent data loss and handle skipped questions correctly.

### Frontend localStorage Strategy

**Storage Key:** `quiz_progress_{quizId}`

**Stored Data:**
```typescript
{
  quizId: string;
  attemptId?: number;
  startedAt: string;
  currentQuestion: number;
  remainingTime?: number;
  responses: {
    [questionId]: {
      option?: string;
      textAnswer?: string;
    }
  }
}
```

**Key Principles:**
- Only answered questions exist in `responses` object
- Skipped questions have NO entry in localStorage
- Auto-save with 500ms debounce on every answer change
- No manual save button required
- Persistent across browser refresh/crash

### Auto-Save Implementation

**Debounced Save:**
- Triggers 500ms after last answer change
- Prevents excessive writes during rapid navigation
- Updates both React state and localStorage

**Answer Change Flow:**
1. Student selects/changes answer
2. Update React state immediately
3. Update progress object
4. Debounce save to localStorage (500ms)
5. Allow free navigation (no data loss)

### Batch Submission

**Single API Request:**
- All responses submitted at once via `POST /api/v1/user/quiz/attempt/:attemptId/submit`
- Request body: `{ responses: Array<{ problemId, option?, textAnswer? }> }`
- Backend calculates score server-side
- Backend determines correct/wrong/skipped counts
- Transaction ensures atomicity

**Skipped Questions Handling:**
- Only answered questions included in `responses` array
- Backend infers skipped questions by comparing total questions vs responses count
- No empty/null response rows inserted into database

### Timer Auto-Submission

**On Timer Expiry:**
1. Frontend automatically calls `handleSubmit()`
2. Reads all responses from localStorage
3. Submits batch to backend
4. Clears localStorage on success
5. Redirects to results page

**Behavior:**
- Identical to manual submit button
- No data loss due to timeout
- Student cannot prevent submission after expiry

### Crash Recovery

**On Page Load:**
1. Check localStorage for existing progress
2. If found with responses, resume from saved state
3. Restore:
   - Current question index
   - All answered questions
   - Remaining timer (if applicable)
4. Continue attempt seamlessly

**No Data Loss:**
- Progress saved before every state change
- Debounced saves prevent race conditions
- Failed submissions keep localStorage intact
- Retry allowed without losing answers

### Backend Batch Processing

**Validation:**
- Verify attempt ownership
- Check attempt not already completed
- Validate all problemIds belong to quiz

**Scoring:**
- Server-side calculation only
- Compare responses against correct options
- Count correct, wrong, and skipped
- Calculate percentage and rank

**Transaction:**
- Update quiz_attempts with final score
- Insert only non-skipped responses into quiz_student_response
- Commit on success, rollback on failure

### Frontend Implementation

**Key Files:**
- `src/utils/quizProgressStorage.ts` - localStorage utilities
- `src/app/(app)/quiz/[quizId]/attempt/page.tsx` - Quiz attempt page

**Key Functions:**
```typescript
// Initialize progress
initializeQuizProgress(quizId, attemptId)

// Save/Load/Clear
saveQuizProgress(progress)
loadQuizProgress(quizId)
clearQuizProgress(quizId)

// Update responses
updateResponse(progress, questionId, response)
removeResponse(progress, questionId) // for skips

// Batch submission
getResponsesArray(progress)

// Utilities
createDebouncedSave(500)
hasUnsavedProgress(quizId)
```

### Error Handling

**Submission Failures:**
- Keep localStorage intact
- Show error message
- Allow retry without data loss

**Network Errors:**
- Debounced saves queue automatically
- Progress preserved in localStorage
- Next load resumes from last save

**Duplicate Prevention:**
- Backend checks attempt status
- Reject if already completed
- Frontend disables submit button after attempt

### Performance

**Optimizations:**
- Debounced saves (500ms)
- Batch submission (single API call)
- No per-question API requests
- Minimal re-renders with React state

**Benefits:**
- Reduced network overhead
- Faster question navigation
- Reliable crash recovery
- No duplicate submissions
