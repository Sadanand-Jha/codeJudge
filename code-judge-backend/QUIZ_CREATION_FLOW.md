# Quiz Creation Flow — Backend README

> Single source of truth: `PostgreSQL → Prisma model → Repository → Service → Controller → Route → Frontend Studio → Live Game`. Creator Studio never controls Top-Down; Top-Down runs in every quiz.

---

## 1. Stack & Entry Points

| Layer | Tech | File |
|---|---|---|
| HTTP | Express 4 + Zod validation | `src/app.ts:1`, `src/server.ts:1` |
| Auth | JWT `session_token` (httpOnly) + Redis blacklist | `src/middleware/auth.ts:21` |
| DB | PostgreSQL `pg Pool` (IST session `Asia/Kolkata`) | `src/app.ts:40` |
| Migrations | SQL in `database/migrations/*.sql` via `src/migrate.ts:1` | `database/migrations/init.sql`, `01_quiz.sql`, `04_quiz_game_config.sql`, `05_topdown_present_everywhere.sql` |
| Prisma shape | Raw SQL but documented as Prisma | `src/models/quizGameConfig.ts:12` |

Base prefix: `app.use("/api", apiRoutes)` → `/api/v1/user/quiz` (`src/routes/index.routes.ts:31`, `src/routes/v1/user/index.ts:30`)

All quiz routes are `router.use(authenticate)` (`src/routes/v1/user/quiz.routes.ts:3`).

---

## 2. Data Model (1:1)

```
Quiz 1 ── 1 QuizGameConfig   (quiz_id UNIQUE, FK ON DELETE CASCADE)
     1 ── * QuizProblem
                1 ── * QuizProblemOption
     1 ── * QuizParticipants (allow-list)
     1 ── * QuizRegistration / QuizAttempt / QuizStudentResponse
```

**`quiz`**: `name`, `code` (16 chars, unique), `createdby` (owner), `visibility`, `difficulty`, `subject_id`, `exam_cat`, `duration`, `total_marks`, `passing_marks`, `shuffle_questions/options`, `show_results_immediately`, `negative_marking`, `leaderboard`, `quiz_status` (FK `quiz_status`), `starttime/endtime`.

**`quiz_game_config`** (`src/models/quizGameConfig.ts:57`, `database/migrations/05_*`):
`quiz_id UNIQUE`, `enabled DEFAULT TRUE` (present everywhere), `movement_enabled TRUE`, `movement_speed 5`, `lives 3`, `points_enabled TRUE`, `powerups_enabled FALSE`, `respawn_enabled TRUE`, `damage_enabled FALSE`, `CHECK(movement_speed>0)`, `CHECK(lives>=0)`. Backend default `src/repositories/quiz.repository.ts:1697` (`enabled:true`) mirrors DB.

**`quiz_problems`**: `quiz_id`, `problem_statement/description`, `quiz_problem_type` (FK), `question_number`, `explaination`, `hint`, `difficulty`, `marks/negative_marks`, `reference_notes`.

**`quiz_problem_options`**: `problem_id`, `option_statement/description`, `matching_target`, `iscorrect`.

Frontend ↔ DB naming: `movement_enabled → movementEnabled` via `mapRowToConfig` (`quizGameConfig.ts:70`, `quiz.repository.ts:1711`) — no manual conversion scattered.

---

## 3. Creator Studio → Backend Mapping (9 steps)

Studio state: `src/components/creator/quiz-studio/types.ts:203` (`StudioState`), managed by `StudioProvider` (`StudioProvider.tsx:364`). `DEFAULT_*` hold per-step defaults. `steps` constant `STEPS: Setup → Questions → Game Mechanics → Settings → Audience → Registration → Pricing → Branding → Review → Publish`.

| Studio Step | UI State | Save Trigger | Backend Call | DB Write |
|---|---|---|---|---|
| **Setup** | `info: title, code, subjectId/examId, difficultyId, duration, marks, dates` | Next / Save | `POST /api/v1/user/quiz` (`quiz.routes.ts:34` → `createQuiz:225`) or `PUT /:quizId` | `INSERT quiz` (`quiz.repository.ts:425`) → returns `id`; `generateUniqueCode` (`172`) for 16-char code |
| **Questions** | `questions: CreatorQuestion[]` (type, title, options, correctAnswer, marks, difficulty, matchItems) | `nextStep` from Questions validates then `saveToServer()` | Diff-based `computeChangedQuestions` (`quizQuestionSync.ts`) → `POST /problems/save-full` (`quiz.routes.ts:44` → `saveQuizProblemFull:672`) per changed/new question; `DELETE` sweep for removed; `PUT /:quizId/reorder` | Transaction `saveQuizProblemFull:751` (`BEGIN/COMMIT`) – upserts `quiz_problems` + replaces `quiz_problem_options`; supports `matching_target` for `match_following`/`fill_blanks` (type 12/6) |
| **Game Mechanics** | `gameMechanics: GameMechanicsConfig` (`gameMechanics.ts:88`) – `fiftyFifty`, `audiencePoll`, `hint`, `skip`, `extraTime`, `doublePoints`, `freezeTimer`, `eliminateOne`, `streakBonus/speedBonus/secondChance/decayingPoints`, `usageRules`. Disabled → `uses=0` via `normalizeMechanicUses`/`zeroAllMechanics` (`gameMechanics.ts:124`). | In-memory until Publish; normalized via `updateGameMechanics` (`StudioProvider.tsx:488`) | **No backend table** – purely assessment HUD, not persisted via `quiz_game_config`. Top-Down is separate and always-on. | — (future: could persist to `quiz.metadata`) |
| **Settings** | `settings: randomize, negativeMarking, showResultsImmediately` | `saveToServer` (same QUICK payload) | `PUT /:quizId` (`quiz.routes.ts:36`) | `UPDATE quiz SET shuffle_questions, shuffle_options…` (`quiz.repository.ts:522`) |
| **Audience** | `audience: roomIds, roomStudentSelections, invitedEmails` | `saveToServer` after questions | `PUT /:quizId/participants` (`quiz.routes.ts:72` → `setQuizParticipants:2131`) | `DELETE+INSERT quiz_participants` tx (`quiz.repository.ts:1633`) deduped by email, `source room/individual`, `allowed` |
| **Registration/ Pricing/ Branding** | `registration/ pricing/ branding` | local only (no dedicated table yet) | — | — |
| **Review** | Read-only summary | — | `GET /:quizId` + `GET /:quizId/problems` | — |
| **Publish** | `published: bool` | `saveToServer({publish:true})` → `PATCH /:quizId/status` | `PATCH /:quizId/status` (`quiz.routes.ts:38` → `updateQuizStatus:489`) validates `status ∈ {published,unpublished,draft,archived}` | `UPDATE quiz.quiz_status` |

**Snapshot diff (avoid resaving unchanged):** `snapshotRef = buildQuestionSnapshot(questions)` on load (`StudioProvider.tsx:415`), `computeChangedQuestions(state.questions, snapshotRef.current)` on save (`785`). Only changed/new IDs are POSTed; deletes are swept server-side.

**Create vs Edit:** `editMode && initialQuizId` → `loadQuizForEdit` (`services/quiz.ts:212`) fetches `getQuizById` + `getQuizProblems` + `getAllSubjects/getAllExamCategories`, maps via `mapBackendProblem`/`mapQuizToStudioInfo` (`StudioProvider.tsx:82`). New draft → `initialState()` with `q_1` and generated `code`.

---

## 4. Top-Down — Present Everywhere (No Creator Toggle)

Creator Studio has **no access** to Top-Down; it runs for every quiz.

* Default: `enabled TRUE` (migration `05_*`: `ALTER enabled SET DEFAULT TRUE; UPDATE ... SET enabled=TRUE`). Service fallback `getDefaultGameConfig:1697` also `true`.
* Frontend: `LiveCampus` (`components/quiz/live/live-campus/LiveCampus.tsx:30`) fetches via `useQuizGameConfig` (`hooks/useQuizGameConfig.ts:23`) before initializing canvas (`if(configLoading) return spinner`). If `gameConfig.enabled === false` (legacy row), HUD shows `Game Disabled` but canvas still renders. Waiting room (`waiting/page.tsx:395`) always mounts `LiveCampus` irrespective of `viewMode` (light/dark/real).
* Runtime uses config, not constants: `MovementController` (`player/MovementController.ts:18`) `effectiveSpeed = (movementSpeed/5)*220`, `movementAllowed = movementEnabled`; interior loop same (`LiveCampus.tsx:305`), respawn `R` respects `respawnEnabled:338`.
* Game mechanics off ⇒ `uses=0` (normalized), but Top-Down stays; mechanics never disable Top-Down.

API (kept, but not surfaced in Studio):

```
GET  /api/v1/user/quiz/:quizId/game-config  (also GET /api/quizzes/:quizId/game-config alias index.routes.ts:10)
PUT  /api/v1/user/quiz/:quizId/game-config  {enabled,movementEnabled,movementSpeed,lives,pointsEnabled,powerupsEnabled,respawnEnabled,damageEnabled}
```

* `GET` returns DB row mapped to camelCase or defaults without creating row (`quiz.repository.ts:1725`).
* `PUT` is `INSERT ... ON CONFLICT (quiz_id) DO UPDATE` (`1734`) — race-safe, never duplicate. Validated by `quizGameConfigSchema` (`validate.ts:215`): `movementSpeed int>0`, `lives int>=0`, booleans strict, plus controller double-check (`quiz.controller.ts:2220`). Only owner/collaborator (`createdby === userId || isAcceptedCollaborator`) → else `403`; `quiz not found →404`; `23514 →400`.

---

## 5. Other Key Routes

| Method | Path | Handler | Notes |
|---|---|---|---|
| `GET` | `/` | `getAllQuizzes` | filters `search/status/visibility/difficulty/userId`, paginated |
| `GET` | `/code/:code` | `getQuizByCode` |  |
| `GET` | `/visibility-options`, `/difficulty-options`, `/generate-code` | list FK tables |  |
| `GET/POST/PUT/DELETE` | `/…/problems`, `/problems/save-full`, `/problems/:problemId/duplicate`, `/:quizId/reorder` | question CRUD + tx |  |
| `POST` | `/:quizId/clone` | `cloneQuiz:580` | tx copies quiz+problems+options, status→draft |
| `POST` | `/:quizId/start`, `/attempt/:attemptId/save`, `/attempt/:attemptId/submit` | attempt lifecycle | `checkQuizAccess` (published, time window, registered) |
| `GET` | `/result/:attemptId`, `/result/:attemptId/review`, `/:quizId/leaderboard|analytics|responses` | results | owner/collab checks |
| `POST` | `/:quizId/collaborators/request`, `GET /:quizId/collaborators`, `DELETE .../:targetUserId`, `PATCH /collaborator-requests/:quizId` | collaborator flow | `isAcceptedCollaborator` |
| `POST` | `/register`, `/join` | `registerForQuiz/joinQuiz` | `isUserRegistered` |

---

## 6. Validation & Security

* **Zod** per route (`validate.ts:56`): `quizSchema`, `quizProblemSchema`, `quizGameConfigSchema`, etc. — first error returned `400 Validation error (field): msg`.
* **Auth:** `authenticate:21` reads `session_token` cookie/`Authorization: Bearer`, checks Redis blacklist `blacklist:{token}`, `jwt.verify(JWT_SECRET)` → `req.user`.
* **Authorization:** write → owner or `isAcceptedCollaborator` (`quiz.repository.ts:1230`); read → any authenticated user of quiz; sensitive errors never leak (`500 Internal server error while ...` generic, no stack).
* **Data consistency:** `ON CONFLICT` upserts, `BEGIN/COMMIT/ROLLBACK` for `saveFull`, `clone`, `attempt submit`. `quiz_id UNIQUE` prevents dup.

---

## 7. Frontend Integration (Studio)

* **API client:** `lib/axios.ts:5` (`NEXT_PUBLIC_API_URL` → `http://localhost:8000/api`, `withCredentials`, unwraps `{success,data}`).
* **Services:** `services/quiz.ts:10` (`Quiz` interface) + CRUD + `getQuizGameConfig/updateQuizGameConfig` (`QuizGameConfig` interface `enabled/movementEnabled...`).
* **Hook:** `hooks/useQuizGameConfig.ts:23` — `GET` on mount, `draft` local, `save()` does `PUT` then updates state only on success (never optimistic), generic error mapping (no table names exposed).
* **StudioProvider save:** `saveToServer({setupOnly})` creates quiz first to obtain `serverQuizId`, then `syncQuizQuestions` (changed only), then `setQuizParticipants`; publish adds status patch.

---

## 8. Polling → Live

```
WaitingRoom (LiveCampus) → POST /:quizId/start → in_progress attempt
→ POST /attempt/:attemptId/save (autosave, optional) or batch submit
→ POST /attempt/:attemptId/submit {responses: [{problemId,option,textAnswer}]} → server scores, sets completed
→ GET /result/:attemptId, /review, /leaderboard, /analytics
```

Local storage `quiz_progress_{quizId}` keeps progress debounce 500 ms; submit is batch (single `responses` array), skipped = absent.

---

## 9. Migrations

`npm run migrate` (`migrate.ts:109`) tracks `schema_migration`. Idempotent `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`, FKs with `DROP CONSTRAINT IF EXISTS` before add. Key files: `init.sql` (users, avatar, role, contest, problems, quiz* stubs), `01_quiz.sql` (quiz_status/participant, `quiz_game_config` now default TRUE), `02_rooms.sql`, `03_follows.sql`, `04_quiz_game_config.sql`, `05_topdown_present_everywhere.sql`.

---

## 10. Run & Verify

```bash
npm install
cp .env.example .env   # set PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE=Aquiven etc, JWT_SECRET, SMTP_HOST/PORT
npm run migration:dry   # list pending
npm run migrate         # apply
npm run dev             # tsx watch src/server.ts ( + redis if `npm run dev` )
npm run build && npm start
```

Case checks: **new quiz** `GET .../game-config` → defaults `enabled:true,movementSpeed:5,lives:3…`; **update** `PUT` then refresh retains; **runtime** `LiveCampus` HUD reflects `Movement · 5`, `Lives 3` and respects `movementEnabled`; **unauthorized PUT** → 403; **concurrent PUT** → single row via `ON CONFLICT`.

File pointers are line-anchored (`path:line`) for direct navigation.
