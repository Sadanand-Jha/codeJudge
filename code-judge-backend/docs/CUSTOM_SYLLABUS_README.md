# Custom Syllabus - End-to-End Flow

This document describes how teacher-owned custom syllabi work across the
backend and frontend: database model, API, document import, AI generation,
editing, unified dropdowns, question-bank integration, recovery, and testing.

## 1. What the feature does

Teachers can:

- Create a syllabus manually with chapters and topics.
- Import a PDF, DOCX, or TXT syllabus.
- Let AI produce one balanced, editable syllabus.
- Import a multi-subject document: each detected subject becomes its own
  syllabus card.
- Review/edit the generated syllabus, rename it, or save it.
- Re-import or update an existing syllabus.
- Delete a syllabus without breaking historical data.
- Use their syllabus in the problem generator, quiz setup, manual problem
  creator, and question-bank filters.

Teachers must import their own syllabi. The shared system catalog is soft-deleted
by the migration so existing quizzes and question-bank rows keep valid references,
but system subjects no longer appear in teacher-facing catalogs. Teacher-owned
syllabi live in the same `subjects` / `subject_chapters` / `chapter_topics` tables,
separated by `owned_by`.

## 2. Architecture

```
Browser
  |
  |  /api/v1/user/syllabus/*
  v
Express routes
  src/routes/v1/user/syllabus.routes.ts
  |
  +--> customSyllabus.controller.ts
  |      |
  |      +--> customSyllabus.service.ts  (CRUD, ownership, search)
  |      +--> syllabusBreakdown.service.ts (upload, jobs, AI import, recovery)
  |
  +--> PostgreSQL
         subjects          (one row per syllabus; owned_by scopes ownership)
           subject_chapters
             chapter_topics
         syllabus_import_jobs
         quiz_question_bank (FKs point at subjects/subject_chapters/chapter_topics)
         quiz (subject_id points at subjects)
```

The frontend calls the API through `src/services/syllabus.ts` in
`code-judge-frontend`.

## 3. Database model

Migration: `database/migrations/75_teacher_syllabus_ownership.sql`.

The migration adds ownership and syllabus metadata to the existing curriculum
tables. There are no separate `syllabi` / `chapters` / `topics` tables:

### `subjects`

- `id`, `subject_name`, `name` (syllabus display name)
- `owned_by` - `0` means a platform/system row; any other value is the owning
  user id
- `board`, `class_level`, `level`
- `source_file_ref`, `import_job_id`
- `status` (`draft` or `active`)
- `created_at`, `updated_at`, `deleted_at`

Rules:

- System rows have `owned_by = 0` and are soft-deleted (`deleted_at` set) by the
  migration.
- Teacher rows have `owned_by = <user id>`.
- Teacher syllabus names are unique per owner, case-insensitively, among
  non-deleted rows.
- System subject names are unique globally, case-insensitively.
- Deletes are soft deletes (`deleted_at`).

### `subject_chapters`

- `id`, `subject_id`, `chapter_name`, `description`, `position`
- `owned_by` mirrors the parent subject owner (`0` for system rows).
- Cascades when a subject row is hard-deleted.
- `position` keeps display order.

### `chapter_topics`

- `id`, `chapter_id`, `topic_name`, `position`
- `owned_by` mirrors the parent chapter owner (`0` for system rows).
- Cascades when a chapter is hard-deleted.

### `syllabus_import_jobs`

- `id` UUID, `teacher_id`
- `original_filename`, `file_ref`, `mime_type`, `bytes`
- `source_text` - extracted text persisted for restart recovery
- `status` (`queued`, `processing`, `ready`, `failed`), `progress`
- `credits_used`, `variants_json`, `error_message`
  - `variants_json` stores `{ balanced }`, where the value is an array of
    generated syllabi; multi-subject documents produce one item per subject.
    Older single-object jobs are normalized to a one-item array when read.
- `stream_text` - throttled tail of live AI output for the import dialog
- `created_at`, `updated_at`

The raw uploaded file is not stored. Extracted source text and the latest
streamed output tail are persisted only while the job is active. Both are
cleared when the job reaches `ready` or `failed`.

### Ownership and ids

The migration adds `owned_by` to the existing curriculum tables without moving
or renumbering system rows. System subject/chapter/topic ids are unchanged and
their subjects are soft-deleted, so existing quizzes and question-bank rows stay
valid. New teacher-owned rows get normal sequence ids and are isolated by
`owned_by`; no separate id namespace or legacy-table backfill is required.

### Question-bank integration

`quiz_question_bank.subject_id`, `chapter_id`, and `topic_id` reference
`subjects`, `subject_chapters`, and `chapter_topics`. The trigger
`validate_quiz_question_bank_scope` validates that chapter/topic belong to the
selected subject. Existing question-bank rows stay valid.

### Quiz integration

`quiz.subject_id` references `subjects`. System subject ids are unchanged, and
teacher-owned custom syllabi are stored as rows with `owned_by = <user id>`.

## 4. Teacher flow

### 4.1 Manual creation

1. Teacher opens `/creator/syllabus`.
2. Clicks `New syllabus`.
3. Fills name, subject, optional board/class/level/status.
4. Adds chapters and topics in the tree editor.
5. Saves. `POST /api/v1/user/syllabus` creates the syllabus and tree in one
   transaction.
6. The list refreshes and shows chapter/topic counts.

### 4.2 AI document import

1. Teacher opens the import dialog.
2. Dialog fetches `GET /api/v1/user/syllabus/import/cost`.
3. Teacher attaches a PDF/DOCX/TXT and submits.
4. `POST /api/v1/user/syllabus/import` (multipart field `file`):
   - validates extension and MIME type
   - validates PDF/DOCX magic bytes
   - enforces size limits (the per-hour rate limit is optional)
   - checks the teacher has enough AI credits
   - extracts text synchronously
   - rejects empty/scanned/image-only documents
   - rejects documents that exceed the configured chunk limit
   - debits credits with ref `syllabus_import:<jobId>`
   - inserts the job with `source_text`
   - schedules background AI work
5. Dialog polls `GET /api/v1/user/syllabus/import/:jobId` every 1.5 seconds
   for status/progress and subscribes to
   `GET /api/v1/user/syllabus/import/:jobId/stream` (SSE) for live,
   word-grouped AI output.
6. When status is `ready`, a single-subject document opens the existing
   editable syllabus editor.
7. A multi-subject document opens the multi-subject review dialog instead. It
   shows one card per detected subject and selects which subject cards to
   create.
8. Saving calls `POST /api/v1/user/syllabus` for each selected subject with the
   shared `importJobId`.
9. Backend verifies that the job belongs to the teacher and is `ready`, then
   links `source_file_ref` and `import_job_id` to every created syllabus.

Any failure marks the job `failed`, refunds the credits, and clears
`source_text`.

### 4.3 Editing / rename / delete

- `PUT /api/v1/user/syllabus/:id` replaces the metadata and chapter/topic tree
  in one transaction.
- `PATCH /api/v1/user/syllabus/:id/rename` renames without touching the tree.
- `DELETE /api/v1/user/syllabus/:id` sets `deleted_at`; the syllabus disappears
  from lists and search.
- Only the owner can edit, rename, or delete a teacher syllabus.
- System syllabi are hidden from teachers and cannot be read or modified.

### 4.4 Re-import

The list page exposes re-import on an existing syllabus. It runs the same import
job flow and saves the generated syllabus back through the update endpoint. For a
multi-subject document, the review dialog updates the target syllabus with the
first selected subject and creates the remaining subjects as new cards.

## 5. Unified syllabus search

`GET /api/v1/user/syllabus/search`

Query parameters:

- `q` - search text
- `type` - `syllabus`, `chapter`, or `topic` (optional)
- `syllabus_id` - restrict to a syllabus (optional)
- `chapter_id` - restrict to a chapter (optional)
- `limit` - result limit (optional)

Response item:

```json
{
  "type": "chapter",
  "id": 1234,
  "scope": "teacher",
  "name": "Arrays",
  "subject": "Computer Science",
  "syllabusId": 1000001,
  "syllabusName": "Data Structures",
  "chapterId": 1234,
  "chapterName": "Arrays",
  "owned": true
}
```

The search includes only the current teacher's non-deleted syllabi. System rows
and other teachers' rows are excluded.

## 6. API summary

All routes require authentication. Teacher-only routes are marked below.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/user/syllabus/search` | Unified syllabus/chapter/topic search |
| GET | `/api/v1/user/syllabus/import/cost` | Import cost and limits (teacher) |
| POST | `/api/v1/user/syllabus/import` | Start import job (teacher, active AI user, credits) |
| GET | `/api/v1/user/syllabus/import/:jobId` | Poll import job (teacher) |
| GET | `/api/v1/user/syllabus/import/:jobId/stream` | Live SSE output stream (teacher) |
| GET | `/api/v1/user/syllabus` | List own syllabi (teacher) |
| POST | `/api/v1/user/syllabus` | Create syllabus (teacher) |
| GET | `/api/v1/user/syllabus/:id` | Read own syllabus tree |
| PUT | `/api/v1/user/syllabus/:id` | Replace own syllabus (teacher) |
| PATCH | `/api/v1/user/syllabus/:id/rename` | Rename own syllabus (teacher) |
| DELETE | `/api/v1/user/syllabus/:id` | Soft-delete own syllabus (teacher) |

Create/update request body:

```json
{
  "name": "Data Structures",
  "subject": "Computer Science",
  "board": "CBSE",
  "classLevel": "12",
  "level": "Undergraduate",
  "status": "active",
  "importJobId": null,
  "chapters": [
    {
      "title": "Arrays",
      "description": "Linear data structure",
      "topics": [{ "title": "Traversal" }, "Searching"]
    }
  ]
}
```

Topic entries may be strings or `{ "title": "..." }`. Duplicate chapters and
topics are merged case-insensitively.

## 7. Import pipeline internals

File: `src/services/syllabusBreakdown.service.ts`

1. `validateSyllabusUpload` checks file presence, extension, MIME, size, and
   magic bytes.
2. `startSyllabusImport` enforces credits and, when configured, the hourly rate limit.
3. Text is extracted before inserting the job. This avoids charging for
   unreadable/scanned files and makes the job independent of the raw buffer.
4. `source_text` is stored in the job row.
5. `runSyllabusImportJob`:
   - marks the job `processing` at 5%
   - starts a smooth progress heartbeat that advances to 99% in about 35
     seconds, independent of AI latency
   - splits text into chunks
   - calls the AI provider for each chunk with the balanced-syllabus
     instruction
   - streams raw AI output deltas to the backend terminal
   - groups deltas at word boundaries and publishes them to SSE subscribers
   - throttles the latest 12,000 characters of streamed output into
     `stream_text` as a polling fallback
   - enforces a per-job token budget (`SYLLABUS_IMPORT_MAX_TOKENS`, default
     50,000); each call receives the remaining budget and the job fails with a
     refund if the budget is exhausted
   - merges chunks with `mergeGeneratedChunks`
   - splits course-prefixed chapters into one generated syllabus per subject
     with `splitGeneratedSyllabus` (for example
     `"Artificial Intelligence: Introduction"` becomes the chapter
     `"Introduction"` under the `"Artificial Intelligence"` syllabus)
   - stores the generated syllabus array in `variants_json`, marks `ready`
     at 100%, and clears `source_text`
   - progress updates never move backwards and stop once the job is no longer
     `queued`/`processing`
6. On any error, `failJob` stores the message, marks `failed`, refunds credits,
   and clears both `source_text` and `stream_text`.

### Restart recovery

`recoverInterruptedSyllabusImports` runs on backend startup when background
workers are enabled (`src/server.ts`).

- Jobs still `queued`/`processing` with `source_text` are resumed.
- Jobs without `source_text` (old jobs or interrupted extraction) are marked
  `failed` and refunded with a "server restarted" message.
- Refunds are idempotent via `credit_transactions.ref_id`.

This means an import survives a backend restart after the job row is inserted.
A crash during text extraction happens before debit/job creation, so the user
simply retries.

## 8. Frontend implementation map

Frontend repo: `code-judge-frontend`

- `src/services/syllabus.ts`
  - API client and TypeScript types.
- `src/components/creator/syllabus/MySyllabusPage.tsx`
  - List, search, create/edit/import/re-import/rename/delete, onboarding state.
- `src/components/creator/syllabus/SyllabusEditor.tsx`
  - Metadata and chapter/topic tree editing.
  - Status and move-topic use the shared themed `QsSelect`.
- `src/components/creator/syllabus/SyllabusImportDialog.tsx`
  - Cost display, drag/drop, upload, polling, progress, live AI output preview,
    retry.
- `src/components/creator/syllabus/SyllabusMultiImportDialog.tsx`
  - Multi-subject review: per-subject checkboxes, save all selected subjects as
    separate syllabus cards, re-import target handling.
- `src/components/creator/syllabus/SyllabusSearchSelect.tsx`
  - Shared searchable syllabus/chapter/topic dropdown.
  - Hides the secondary subject line when it duplicates the syllabus name.
- `src/app/creator/syllabus/page.tsx`
  - Protected creator route; reads `?onboarding=1`.
- `src/components/creator/layout/CreatorSidebar.tsx`
  - "My Syllabus" nav entry and focus-mode route.
- `src/components/creator/dashboard/CreatorDashboardPage.tsx`
  - Quick action and dashboard entry.
- `src/components/forms/RegistrationForm.tsx`
  - Teachers without a `nextPath` go to
    `/creator/syllabus?onboarding=1`.

Unified selectors are used in:

- `src/components/creator/quiz-studio/steps/SetupStep.tsx`
- `src/components/quiz/creator/QuizSettingsPage.tsx`
- `src/components/quiz/creator/QuizDetailsForm.tsx`
- `src/components/creator/problems/ManualProblemCreator.tsx`
- `src/components/creator/problems/PaperScopeFilters.tsx`
- `src/components/creator/problems/QuestionBankFilters.tsx`
- `src/components/creator/problems/CreateProblemGenerator.tsx`

## 9. Configuration

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SYLLABUS_IMPORT_CREDIT_COST` | `10` | Credits charged per import |
| `SYLLABUS_IMPORT_MAX_BYTES` | `10485760` | Max upload size |
| `SYLLABUS_IMPORT_MAX_CHUNKS` | `25` | Max document chunks |
| `SYLLABUS_IMPORT_CHUNK_CHARS` | `10000` | Chars per AI chunk |
| `SYLLABUS_IMPORT_MAX_PER_HOUR` | `0` | Imports per teacher per hour (`0` disables the limit) |
| `SYLLABUS_IMPORT_CALL_TIMEOUT_MS` | `180000` | AI call timeout |
| `SYLLABUS_IMPORT_PROGRESS_SECONDS` | `35` | Seconds for the progress heartbeat to reach 99% |
| `SYLLABUS_IMPORT_MAX_TOKENS` | `50000` | Total token budget per import job |
| `SYLLABUS_IMPORT_MAX_CALL_TOKENS` | `16000` | Max generated tokens in one AI call |

Import recovery only runs when `DISABLE_BACKGROUND_WORKERS` is not `1` and
`VERCEL` is not `1`.

## 10. Apply and verify

Apply only the custom syllabus migration locally (the repo may contain other
intentionally pending migrations):

```bash
npx tsx src/migrate.ts --only=75_teacher_syllabus_ownership.sql
```

Run checks:

```bash
npx tsc --noEmit
npm run test:syllabus
RUN_SYLLABUS_DB_TESTS=1 npm run test:syllabus:db
```

Manual recovery of stuck imports:

```bash
npx tsx -e "import { recoverInterruptedSyllabusImports } from './src/services/syllabusBreakdown.service.ts'; import { pool } from './src/config/database.ts'; void (async () => { await recoverInterruptedSyllabusImports(); await pool.end(); })();"
```

Verify foreign keys:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('quiz_question_bank'::regclass, 'quiz'::regclass)
  AND contype = 'f';
```

## 11. Security and limits

- All syllabus routes require authentication.
- Teacher rows are filtered by `owned_by`; another teacher's row is returned
  as 404.
- System rows are soft-deleted and hidden from teacher-facing catalogs; they
  reject mutation.
- Uploads accept only PDF, DOCX, TXT; MIME and magic bytes are checked.
- Max 10 MB by default, one file per request. The per-hour import rate limit is disabled by default; set `SYLLABUS_IMPORT_MAX_PER_HOUR` above zero to enable it.
- AI prompts treat document text as untrusted data.
- Import cost is fixed per job and refunded on failure, even when one job
  creates several subject syllabi.
- Each import job is capped at 50,000 total AI tokens by default and fails with
  a clear error plus refund if the budget is exhausted.
- Raw streamed AI output is only a temporary tail in `stream_text`; it is cleared
  on success or failure and is never exposed to other teachers.
- Soft deletes keep historical question-bank references intact.

## 12. Known limitations

- Imports run in-process, not in BullMQ. Resume-on-restart works for jobs whose
  text was already persisted, but a crash between upload and job insert simply
  fails the request without charging.
- Multiple backend instances can both run startup recovery. Run recovery on one
  long-lived instance, or add a database claim/lease before scaling out.
- `PUT /:id` deletes and reinserts chapters/topics, so IDs are not preserved.
  Saved papers that hold old chapter/topic IDs could point at removed rows.
- Scanned/image-only PDFs are not supported; text-based documents are required.
- A very large document can hit the 50,000-token job budget before the syllabus
  is generated; shorten the document or raise the limit.
- Multi-subject splitting relies on the AI prefixing chapter titles with the
  course name. If the model omits the prefix, the document remains one
  syllabus; re-run the import or edit it manually.
- Live output uses SSE while a job is active. If SSE is unavailable (for
  example behind a proxy that buffers streams), the dialog falls back to the
  throttled `stream_text` snapshot from normal polling.
- When enabled, rate limiting counts all jobs from the last hour, including failed jobs.
- `getAllSubjects` returns only the current teacher's subjects.
