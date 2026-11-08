# Quiz Student Side — Frontend → Backend Call Map

> Which frontend file calls which service, and where that request lands in the backend.
> Companion docs: `QUIZ_STUDENT_FLOW.md` (student lifecycle/rules) and `QUIZ_MODULE_BACKEND.md` (module reference).

Repo roots used below:
- Frontend: `code-judge-frontend/`
- Backend: `code-judge-backend/`

---

## 1. Request pipeline

```
Student page/component (src/app/(app)/quiz/... or src/components/quiz/...)
  → src/services/quiz.ts                         (single HTTP layer: axios)
  → baseURL /api + withCredentials               (src/lib/axios.ts)
  → next.config.ts rewrite: /api/:path*          → BACKEND_URL/api/:path*
  → src/routes/v1/user/quiz.routes.ts            (router.use(authenticate))
  → src/controllers/quiz.controller.ts
  → src/services/database/quiz.service.ts
  → src/repositories/quiz.repository.ts
  → PostgreSQL
```

- Auth: `session_token` cookie, with a localStorage `Authorization: Bearer` fallback (`src/lib/axios.ts`).
- Every quiz route requires `authenticate`; a missing/invalid session is `401`.
- All responses use `{ success, message?, data?, pagination? }`.
- Validation failures return `400 { success: false, message: "Validation error (<field>): <msg>" }`.

---

## 2. Student screens and their calls

### 2.1 Quiz hub and attempt history

| Frontend file | What it calls | Frontend service (`src/services/quiz.ts`) | Backend endpoint |
|---|---|---|---|
| `src/app/(app)/quiz/page.tsx` | `YourActivitySection` | `getOldQuizzes` (`:442`) | `GET /api/v1/user/quiz/old-quizzes` |
| `src/app/(app)/quiz/attempts/page.tsx` | `YourActivitySection` | `getOldQuizzes` (`:442`) | `GET /api/v1/user/quiz/old-quizzes` |
| `src/components/quiz/live/YourActivitySection.tsx` | activity list/filter/pagination (`:485`) | `getOldQuizzes` (`:442`) | `GET /api/v1/user/quiz/old-quizzes` |

Backend chain for both aliases:

```
GET /old-quizzes or /previous
  → getPreviousQuizzes          (controllers/quiz.controller.ts:1942)
  → QuizService.getPreviousQuizzes (services/database/quiz.service.ts:233)
  → QuizRepository.getPreviousQuizzes (repositories/quiz.repository.ts:1603)
```

### 2.2 Join a quiz

| Frontend file | UI step | Frontend service | Backend endpoint |
|---|---|---|---|
| `src/app/(app)/quiz/join/page.tsx` | code lookup (`:126`) | `getQuizByCode` (`:283`) | `GET /api/v1/user/quiz/code/:code` |
| same | aggregate quiz rating (`:132`) | `getQuizRating` (`:930`) | `GET /api/v1/user/quiz/:quizId/rating` |
| same | teacher public card (`:139`) | `getCreatorStats` (`:969`) | `GET /api/v1/user/quiz/creator/:creatorId/stats` |
| same | avatar crowd (`:147`) | `getQuizCrowdAvatars` (`:1130`) | `GET /api/v1/user/quiz/:quizId/crowd` |

Notes:
- `handleJoin` only navigates to `/quiz/{code}/waiting`; it does **not** call `joinQuiz`.
- `joinQuiz` (`POST /join`) exists for legacy clients but is unused by this page.
- The teacher card exposes only public profile fields and aggregate counts; email/contact details are never returned.

### 2.3 Waiting room and lobby

| Frontend file | Frontend service | Backend endpoint |
|---|---|---|
| `src/app/(app)/quiz/[quizId]/waiting/page.tsx` | `getQuizByCode` (`:283`) on load and poll (`:61`, `:79`) | `GET /api/v1/user/quiz/code/:code` |
| `src/app/(app)/quiz/[quizId]/lobby/page.tsx` | `getQuizByCode` (`:283`) on load (`:21`) | `GET /api/v1/user/quiz/code/:code` |

The lobby's launch button links to `/quiz/{code}/attempt`; no API call happens on click.

### 2.4 Exam attempt

| Frontend file | Action | Frontend service | Backend endpoint |
|---|---|---|---|
| `src/app/(app)/quiz/[quizId]/attempt/page.tsx` | resolve quiz (`:142`) | `getQuizByCode` (`:283`) | `GET /api/v1/user/quiz/code/:code` |
| same | restore active attempt (`:161`) | `getAttemptRegistrationState` (`:765`) | `GET /api/v1/user/quiz/:quizId/attempt-registration` |
| same | create/resume attempt (`:337`) | `startQuizAttempt` (`:746`) | `POST /api/v1/user/quiz/:quizId/start` |
| same | autosave answer (`:377`) | `saveQuizResponse` (`:774`) | `POST /api/v1/user/quiz/attempt/:attemptId/save` |
| same | keep-alive (`:390`) | `heartbeatQuizAttempt` (`:785`) | `POST /api/v1/user/quiz/attempt/:attemptId/heartbeat` |
| same | submit (`:202`, retry `:245`) | `submitQuizAttempt` (`:799`) | `POST /api/v1/user/quiz/attempt/:attemptId/submit` |
| same | poll grading (`:222`) | `getSubmitStatus` (`:824`) | `GET /api/v1/user/quiz/attempt/:attemptId/submit-status` |
| `src/components/quiz/exam/ExamModeShell.tsx` | report proctoring event (`:132`) | `reportViolation` (`:839`) | `POST /api/v1/user/quiz/attempt/:attemptId/violation` |

Submit is asynchronous: the endpoint returns `202 { status: "queued" }`, then the page polls `submit-status` until `completed` and navigates to `/quiz/{code}/results/{attemptId}`.

### 2.5 Result, review, rating, leaderboard

| Frontend file | Frontend service | Backend endpoint |
|---|---|---|
| `src/app/(app)/quiz/[quizId]/results/page.tsx` | `getPreviousQuizzes` (`:1053`), `getQuizByCode` (`:283`) | `GET /previous`, `GET /code/:code` |
| `src/components/quiz/live/AttemptReviewExperience.tsx` | `getQuizResult` (`:899`), `getQuizReview` (`:908`) | `GET /result/:attemptId`, `GET /result/:attemptId/review` |
| same | `getQuizRating` (`:930`), `submitQuizRating` (`:944`) | `GET /:quizId/rating` and `POST /:quizId/rating` |
| `src/app/(app)/quiz/[quizId]/leaderboard/page.tsx` | `getQuizByCode` (`:283`), `getQuizLeaderboard` (`:1115`) | `GET /code/:code`, `GET /:quizId/leaderboard` |

`AttemptReviewExperience` is rendered by `src/app/(app)/quiz/[quizId]/results/[attemptId]/page.tsx`.

### 2.6 Legacy / dead registration flow

`src/app/(app)/quiz/[quizId]/register/page.tsx` still imports `getMyQuizzes`, `getQuizByCode`, `registerForQuiz`, and `unregisterFromQuiz`, but:

- its quiz fetch effect is commented out;
- the page is not reached by the current join flow;
- the backend `POST /register` returns `200 { data: null }` (student registration temporarily disabled);
- `DELETE /register/:quizId` remains for legacy clients.

Do not use this page as the source of truth for the current flow.

---

## 3. Service function → backend handler

| Frontend service (`src/services/quiz.ts`) | HTTP call | Backend route (`src/routes/v1/user/quiz.routes.ts`) | Controller (`src/controllers/quiz.controller.ts`) | Service → repository |
|---|---|---|---|---|
| `getQuizByCode` `:283` | `GET /v1/user/quiz/code/:code` | `:100` | `getQuizByCode` `:235` | `QuizService.getQuizByCode` `:38` → `QuizRepository.getQuizByCode` `:269` |
| `getQuizRating` `:930` | `GET /v1/user/quiz/:quizId/rating` | `:136` | `getQuizRating` `:2010` | `QuizService.getQuizRatingState` `:244` → repo `:1686` |
| `submitQuizRating` `:944` | `POST /v1/user/quiz/:quizId/rating` | `:137` | `submitQuizRating` `:2065` | `QuizService.createQuizRating` `:248` → repo `:1741` |
| `getCreatorStats` `:969` | `GET /v1/user/quiz/creator/:creatorId/stats` | `:140` | `getCreatorStats` `:2040` | `QuizService.getCreatorPublicStats` `:252` → repo `:1784` |
| `getQuizCrowdAvatars` `:1130` | `GET /v1/user/quiz/:quizId/crowd` | `:231` | `getQuizCrowd` `:2364` | `QuizService.getQuizCrowdAvatars` `:256` → repo `:1258` |
| `getAttemptRegistrationState` `:765` | `GET /v1/user/quiz/:quizId/attempt-registration` | `:192` | `getAttemptRegistrationState` `:1357` | `QuizService.getQuizAttempt` `:176` → repo `:1002` |
| `startQuizAttempt` `:746` | `POST /v1/user/quiz/:quizId/start` | `:189` | `startQuizAttempt` `:1195` | `checkQuizAccess` `:225` → repo `:1494`; `getQuizAttempt`, `createQuizAttempt` / `updateQuizAttempt`, `getStudentResponses` |
| `saveQuizResponse` `:774` | `POST /v1/user/quiz/attempt/:attemptId/save` | `:195` | `saveQuizResponse` `:1393` | `getQuizAttemptById`, `getQuizById`, `getQuizProblemById`, `saveStudentResponse` `:197` → repo `:1150` |
| `heartbeatQuizAttempt` `:785` | `POST /v1/user/quiz/attempt/:attemptId/heartbeat` | `:198` | `heartbeatQuizAttempt` `:1471` | `getQuizAttemptById`, `getQuizById`, `touchQuizAttempt` `:328` → repo `:1139` |
| `reportViolation` `:839` | `POST /v1/user/quiz/attempt/:attemptId/violation` | `:201` | `reportViolation` `:1521` | `getQuizAttemptById`, `updateQuizAttempt` → repo `:1101` |
| `submitQuizAttempt` `:799` | `POST /v1/user/quiz/attempt/:attemptId/submit` | `:204` | `submitQuizAttempt` `:1584` | durable fallback queue + BullMQ; `src/services/quizSubmission.service.ts:13` (`processQuizSubmission`) |
| `getSubmitStatus` `:824` | `GET /v1/user/quiz/attempt/:attemptId/submit-status` | `:207` | `getSubmitStatus` `:1711` | BullMQ job state / durable fallback recovery |
| `getQuizResult` `:899` | `GET /v1/user/quiz/result/:attemptId` | `:212` | `getQuizResult` `:2108` | `QuizService.getQuizResult` `:260` → repo `:1844` |
| `getQuizReview` `:908` | `GET /v1/user/quiz/result/:attemptId/review` | `:215` | `getQuizReview` `:2156` | `getQuizResult` + `getQuestionWiseReview` `:264` → repo `:1886` |
| `getOldQuizzes` `:442` | `GET /v1/user/quiz/old-quizzes` | `:89` | `getPreviousQuizzes` `:1942` | `QuizService.getPreviousQuizzes` `:233` → repo `:1603` |
| `getPreviousQuizzes` `:1053` | `GET /v1/user/quiz/previous` | `:86` | `getPreviousQuizzes` `:1942` | same as above |
| `getMyQuizzes` `:400` | `GET /v1/user/quiz/my` | `:83` | `getMyQuizzes` `:1837` | `QuizService.getUserQuizzes` `:78` → repo `:448` |
| `joinQuiz` `:1079` | `POST /v1/user/quiz/join` | `:273` | `joinQuiz` `:2533` | `getQuizByCode` + `checkQuizAccessForRegistration` |
| `registerForQuiz` `:387` | `POST /v1/user/quiz/register` | `:269` | `registerForQuiz` `:1869` | `checkQuizAccessForRegistration` only; returns `data: null` |
| `unregisterFromQuiz` `:392` | `DELETE /v1/user/quiz/register/:quizId` | `:270` | `unregisterFromQuiz` `:1915` | `getQuizAttempt` + `unregisterUser` |
| `getQuizLeaderboard` `:1115` | `GET /v1/user/quiz/:quizId/leaderboard` | `:228` | `getQuizLeaderboard` `:2317` | `getQuizById` + `QuizService.getQuizLeaderboard` `:217` → repo `:1219` |

Route note: `/creator/:creatorId/stats` is declared **before** the generic `/:quizId` route (`quiz.routes.ts:140` vs `:143`), so `creator` is not parsed as a quiz id.

---

## 4. Other backend files used by the student flow

| File | Role |
|---|---|
| `src/middleware/auth.ts` | Cookie/Bearer auth, Redis blacklist, sets `req.user` |
| `src/middleware/validate.ts` | Zod schemas: `joinQuizSchema`, `startQuizAttemptSchema`, `saveQuizResponseSchema`, `submitQuizAttemptSchema`, `reportViolationSchema`, `quizRatingSchema` |
| `src/controllers/quiz.controller.ts` | `toStudentQuiz` student-safe DTO; `attachQuizProblemOptions`; grading intake; rating/creator stats |
| `src/services/database/quiz.service.ts` | Business layer for all student endpoints |
| `src/repositories/quiz.repository.ts` | SQL, ownership checks, aggregate queries |
| `src/services/quizSubmission.service.ts` | Async grading worker logic |
| `src/queues/quizSubmission.queue.ts` / `.worker.ts` | BullMQ queue and worker |
| `src/controllers/roomAccess.controller.ts` | Room join/preview reuses `QuizService.getCreatorPublicStats` via `loadPublicTeacher` |

### Cross-module reuse (rooms)

| Frontend file | Frontend service | Backend endpoint | Backend chain |
|---|---|---|---|
| `src/components/rooms/public/RoomJoinForm.tsx` | `previewRoomJoin` / `joinRoom` (`services/rooms.ts:105`, `:113`) | `POST /api/rooms/join/form`, `POST /api/rooms/join` | `src/routes/roomAccess.routes.ts:31-32` → `roomAccess.controller.ts` → `QuizService.getCreatorPublicStats` |
| `src/components/rooms/public/RoomJoinedView.tsx` | `getCreatorStats` (`services/quiz.ts:969`) | `GET /api/v1/user/quiz/creator/:creatorId/stats` | `getCreatorStats` → `getCreatorPublicStats` |

The room preview/join response embeds the same teacher object, so `TeacherPublicCard` never needs a second request in the join flow.

---

## 5. Data exposure rules (student side)

| Area | Contract |
|---|---|
| Quiz lookup | `toStudentQuiz` (`quiz.controller.ts:17`) returns only `id, code, name, starttime, endtime, duration, total_marks, passing_marks, difficulty, status` |
| Start attempt | Options are whitelisted; `iscorrect`, explanations, hints, reference notes and internal comments are never sent |
| Public problems | `GET /:quizId/problems/public` strips answer keys and private notes |
| Review | Correct answers only for the attempt owner, and only when results are available |
| Leaderboard/crowd | Names/avatars only; crowd is avatar-only with no ranks/scores |
| Ratings | Aggregate-only; one immutable rating per completed attempt |
| Creator stats | Public profile + counts only; **no email, mobile, password, address, or internal user id** |

---

## 6. Known mismatches / legacy helpers

- `getQuizProblemsPublic` (`services/quiz.ts:378`) actually calls `/v1/admin/quiz/:quizId/problems`; it is used by the creator preview (`src/components/creator/preview/QuizPreviewContent.tsx`), not the student attempt. The student-safe endpoint is `/v1/user/quiz/:quizId/problems/public`.
- `getQuizLeaderboardSettings` / `updateQuizLeaderboardSettings` (`services/quiz.ts:1139`, `:1148`) call `/v1/user/quiz/:quizId/leaderboard/settings`, which has no matching backend route.
- `joinQuiz` and `registerForQuiz` are legacy: the current join page navigates directly to the waiting room, and registration is intentionally disabled server-side.
- `getPreviousQuizzes` and `getOldQuizzes` are two frontend helpers for the same `/previous` / `/old-quizzes` alias pair.
