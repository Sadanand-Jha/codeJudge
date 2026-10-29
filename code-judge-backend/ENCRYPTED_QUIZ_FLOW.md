# Encrypted Quiz Payload Backend — Complete Flow

> **TL;DR (Hinglish):** Teacher quiz save karta hai → browser me questions + problem HTML ek random DEK se encrypt hote hain → DEK ko teacher ke 64-hex key (KEK) se wrap kiya jata hai → teacher key PDF download karta hai → confirm karne ke baad sirf ciphertext backend par upload hota hai → students ko sirf IDs/order milte hain aur wo har page load par PDF key paste karke browser me decrypt karte hain. Backend ke paas key kabhi nahi jaati, isliye backend encrypted copy ko padh nahi sakta.

This document explains the complete encrypted-quiz flow added on top of the existing quiz system:

1. **Encrypted quiz copy** (`quiz_secure_payloads`): questions + HTML problem statements ka client-side encrypted snapshot.
2. **Teacher key PDF**: browser-generated one-page PDF/QR containing the 64-hex key and unlock instructions.
3. **Unlock surfaces**: `/creator/quizzes/:id/secure` (read-only preview), student attempt page, and student review page. The key is requested again on every refresh.
4. **Participant ciphertext endpoint**: signed-in users ke liye opaque payload, used by the key-gated attempt/review screens.
5. **Stale tracking**: har question/option write encrypted copy ko stale mark karta hai, taaki next save naya key PDF banaye.

It covers file map, crypto format, database schema, API contracts, save/unlock flows, security rules, migration, testing, and known limitations.

---

## 1. Why this backend exists

The existing quiz runtime needs plaintext on the server for grading, live quiz sessions, leaderboards, and result generation. Its question/option columns are encrypted at rest (see section 9), but the app key can decrypt them. The teacher-key encrypted copy is a **separate, server-unreadable snapshot** plus a client-facing delivery rule:

- The teacher's key is generated in the browser and downloaded as a PDF. It is **never uploaded**.
- The backend stores only:
  - AES-GCM ciphertext for the question JSON,
  - AES-GCM ciphertext for the HTML problem-statement map,
  - a DEK wrapped by the teacher's KEK,
  - an opaque payload id, version, algorithm, and key fingerprint.
- The backend cannot decrypt the encrypted copy. It can only return the blobs.
- The encrypted copy is bound to the quiz through AES-GCM AAD, so ciphertext from one quiz cannot be replayed as another quiz's payload.
- The teacher can open `/creator/quizzes/:id/secure` later, paste the PDF key, and decrypt locally.
- When a payload exists, client-facing attempt/review APIs return **IDs, order, and correctness flags only**. The browser restores all authored text from the key-protected payload. Legacy quizzes without a payload keep the old plaintext response until they are saved again from Studio.

This gives teachers a server-unreadable backup of authored content and keeps question text out of student API responses.

---

## 2. File map

### Backend

| File | What it does | Why it exists |
|---|---|---|
| `database/migrations/64_secure_quiz_payloads.sql` | Creates `quiz_secure_payloads` with ciphertext blobs, wrapped key, fingerprint, version, algorithm, timestamps, and JSONB shape checks. | One encrypted snapshot per quiz. `quiz_id` is the primary key and cascades with the quiz. |
| `database/migrations/65_secure_quiz_payload_stale.sql` | Adds `stale`/`stale_at` and triggers on `quiz_problems` + `quiz_problem_options` that mark the encrypted copy stale after any write. | Keeps the encrypted copy synchronized with every question-related API without touching each controller. |
| `src/services/quizContentCrypto.service.ts` | AES-256-GCM helpers for text, problem rows, and option rows. | Central at-rest encryption and transparent legacy plaintext handling for quiz runtime questions. |
| `src/scripts/encryptQuizContent.ts` | Idempotent backfill for `quiz_problems` and `quiz_problem_options`. | Encrypts existing plaintext quiz runtime rows in place. |
| `src/repositories/secureQuiz.repository.ts` | All SQL for upsert/get/get-meta/mark-fresh/delete. Aliases `payload_id AS "quizId"` in the full payload response. | Keeps ciphertext SQL in one reviewable place. |
| `src/services/secureQuiz.service.ts` | `save`, `get`, `getMeta`, `markFresh`, `remove`. | Thin business layer between controllers and repository. |
| `src/controllers/secureQuiz.controller.ts` | Owner-checked admin endpoints + participant ciphertext endpoint. Enforces `body.quizId === String(owner.quizId)`, sets `Cache-Control: no-store`, never logs request bodies. | HTTP boundary: ownership, validation, response shape, cache policy. |
| `src/controllers/quiz.controller.ts` | Sanitizes `startQuizAttempt` and `getQuizReview` responses when a payload exists; adds `authored_index` for legacy-payload fallback; sanitizes the public problems endpoint for non-owners. | Keeps authored text out of student HTTP responses. |
| `src/services/quizDecoy.ts` | `sanitizeAttemptProblem` / `sanitizeAttemptForStudent`. | Shared allow-list for student-facing attempt rows. |
| `src/middleware/validate.ts` | `secureQuizBlobSchema` + `secureQuizPayloadSchema`. Rejects malformed IV/ciphertext/fingerprint before DB work. | Zod is the payload gate. |
| `src/routes/v1/admin/quiz.routes.ts` | Mounts `GET /:quizId/secure-payload/meta`, `GET /:quizId/secure-payload`, `POST`/`PUT /:quizId/secure-payload`, `POST /:quizId/secure-payload/ack`, `DELETE /:quizId/secure-payload` before generic quiz routes. | Admin/creator access. |
| `src/routes/v1/user/quiz.routes.ts` | Mounts `GET /:quizId/secure-payload` for signed-in participants. | Future client-side quiz rendering; payload is useless without the teacher key. |
| `src/migrate.ts` | Existing migration runner; auto-applies `database/migrations/*.sql`. | Migration 64 is picked up like every other migration. |
| `src/app.ts` | Existing JSON body limit remains `10mb`. | Ciphertext is base64-encoded and larger than plaintext. |

### Frontend (related files)

| File | What it does |
|---|---|
| `code-judge-frontend/src/lib/quizCrypto.ts` | WebCrypto core: `prepareQuiz`, `unlockQuiz`, `downloadKeyPdf`, key normalization/format/fingerprint helpers, `SecureSaveCancelledError`. |
| `code-judge-frontend/src/services/secureQuiz.ts` | Axios calls for meta/full payload/save/delete/student payload. Normalizes older responses where `payloadId` must be used as the AAD `quizId`. |
| `code-judge-frontend/src/components/creator/quiz-studio/components/SecureQuizKeyDialog.tsx` | Key display/copy, PDF download, confirmation checkbox, ciphertext upload. |
| `code-judge-frontend/src/components/creator/quiz-studio/StudioProvider.tsx` | Decides when re-encryption is needed; runs the secure save prompt; tracks secure-dirty state; re-encrypts after the plaintext sync so new server ids are included. |
| `code-judge-frontend/src/components/creator/quiz-studio/SecureQuizUnlock.tsx` | Key paste, fingerprint check, browser decryption, read-only preview. |
| `code-judge-frontend/src/components/quiz/QuizKeyGate.tsx` | Shared student/teacher key-entry gate used by attempt and review. |
| `code-judge-frontend/src/utils/decryptedQuizContent.ts` | Builds a decrypted index and merges authored text into sanitized attempt/review rows by id or authored position. |
| `code-judge-frontend/src/app/(app)/quiz/[quizId]/attempt/page.tsx` | Fetches the student payload, gates the attempt on the key, and merges decrypted text without changing server order. |
| `code-judge-frontend/src/components/quiz/live/AttemptReviewExperience.tsx` | Fetches the payload, gates the review, and merges decrypted question/option/explanation text. |
| `code-judge-frontend/src/app/creator/quizzes/[id]/secure/page.tsx` | `/creator/quizzes/:id/secure` route. |

---

## 3. Security model

### 3.1 Keys

| Name | Size | Where it lives | Purpose |
|---|---|---|---|
| KEK (teacher key) | 32 random bytes = **64 hex characters** | Browser + downloaded PDF only. Never sent to backend. | Wraps/unwraps the DEK. |
| DEK (data key) | 32 random bytes | Generated in browser; exported and wrapped by KEK; cleared from local JS memory after use. | Encrypts question JSON and problem HTML. |
| IV | 12 random bytes per blob | Stored beside ciphertext as base64. | AES-GCM nonce. |
| Fingerprint | SHA-256 of raw KEK bytes = 64 hex chars | Stored in payload + DB. | Lets the browser reject a wrong key before decrypting. |

- The key PDF contains the grouped key (`8-8-8-8-8-8-8-8`) and a QR code of the normalized key.
- Pasting is forgiving: spaces, dashes, colons, and underscores are ignored; the final value must be exactly 64 hex characters.
- The fingerprint is **not** the key. It is safe to store, but the wrapped key and ciphertext are useless without the actual 64-hex key.

### 3.2 Crypto parameters

| Property | Value |
|---|---|
| Cipher | AES-256-GCM |
| WebCrypto algorithm name | `"AES-GCM"` (payload label is `"AES-256-GCM"`) |
| IV length | 12 bytes |
| AAD | UTF-8 bytes of the payload `quizId` |
| Blobs per payload | `questions`, `problemHtml`, `wrappedKey` |
| Wrapped-key plaintext | base64 string of the raw 32-byte DEK |
| Fingerprint | SHA-256 over the raw 32 key bytes, lowercase hex |
| Encoding | base64 for IV/ciphertext/wrapped key |

The same AAD is used for both content blobs and the wrapped key. The backend additionally enforces that the uploaded `quizId` equals the route's numeric quiz id. This prevents moving a payload between quizzes.

### 3.3 What the backend can and cannot see

| Data | Backend sees? | Notes |
|---|---|---|
| Teacher key (KEK) | **No** | Only in browser/PDF. |
| DEK | **No** | Only wrapped. |
| Question JSON | **No** | Only AES-GCM ciphertext. |
| HTML problem statements | **No** | Separately encrypted blob. |
| Key fingerprint | Yes | Non-secret verification value. |
| Quiz id, payload id, version, algorithm | Yes | Routing/metadata. |
| Plaintext runtime questions | **Yes (internal)** | Stored as at-rest ciphertext, decrypted by the server for grading/live features. Student HTTP responses are sanitized when a payload exists. See section 9. |

---

## 4. Encrypted payload format

`POST /api/v1/admin/quiz/:quizId/secure-payload` request body:

```json
{
  "quizId": "123",
  "version": 1,
  "algorithm": "AES-256-GCM",
  "questions": {
    "iv": "base64-12-bytes",
    "ct": "base64-ciphertext-with-gcm-tag"
  },
  "problemHtml": {
    "iv": "base64-12-bytes",
    "ct": "base64-ciphertext-with-gcm-tag"
  },
  "wrappedKey": {
    "iv": "base64-12-bytes",
    "ct": "base64-wrapped-dek"
  },
  "keyFingerprint": "64-lowercase-hex-characters",
  "createdAt": "2026-10-28T10:00:00.000Z"
}
```

- `quizId` is the server quiz id as a string. The frontend passes the numeric quiz id; `prepareQuiz` binds it as AAD.
- `version` is currently `1`.
- `algorithm` is optional in Zod (defaults to `AES-256-GCM`) and restricted to that literal when provided.
- `iv` must be exactly 16 base64 characters (12 bytes).
- `ct` must be at least 24 base64 characters (16-byte GCM tag) and at most 4,000,000 characters.
- `wrappedKey.ct` is capped at 512 characters (a wrapped 32-byte DEK is tiny).
- `keyFingerprint` is lowercased by Zod and checked as 64 hex characters.
- Unknown fields are rejected (`strict` schema).

The encrypted plaintexts are:

```json
// questions blob
{
  "title": "Quiz title",
  "questions": [ /* full CreatorQuestion[] including answers */ ]
}
```

```json
// problemHtml blob
{
  "problemHtml": {
    "question-id": "<p>HTML problem statement</p>"
  }
}
```

`prepareQuiz` builds the HTML map from each question's `problemHtml`, then `title`, and allows explicit overrides. Both blobs are encrypted with the same DEK but with independent IVs.

---

## 5. Database model

### 5.1 `quiz_secure_payloads`

| Column | Type | Notes |
|---|---|---|
| `quiz_id` | `INTEGER PRIMARY KEY` | FK to `quiz(id)` with `ON DELETE CASCADE`. One encrypted snapshot per quiz. |
| `created_by` | `INTEGER` | FK to `users(id)` with `ON DELETE SET NULL`. Last writer. |
| `payload_id` | `VARCHAR(128) NOT NULL` | The AAD id sent by the client. Currently equals the server quiz id string. |
| `version` | `INTEGER NOT NULL DEFAULT 1` | `CHECK (version >= 1)`. |
| `algorithm` | `VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM'` | Payload algorithm label. |
| `questions_blob` | `JSONB NOT NULL` | `{ iv, ct }`. Check constraint requires object with `iv` and `ct`. |
| `problem_html_blob` | `JSONB NOT NULL` | `{ iv, ct }`. Same shape check. |
| `wrapped_key` | `JSONB NOT NULL` | `{ iv, ct }`. Same shape check. |
| `key_fingerprint` | `CHAR(64) NOT NULL` | `CHECK (key_fingerprint ~ '^[0-9a-f]{64}$')`. |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | First save. |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Updated on every upsert. Indexed descending. |

Index:

```sql
CREATE INDEX idx_quiz_secure_payloads_updated_at
  ON quiz_secure_payloads (updated_at DESC);
```

### 5.2 Upsert behavior

`POST` and `PUT` both call the same repository upsert:

```sql
INSERT INTO quiz_secure_payloads (...)
VALUES (...)
ON CONFLICT (quiz_id) DO UPDATE SET
  created_by = EXCLUDED.created_by,
  payload_id = EXCLUDED.payload_id,
  version = EXCLUDED.version,
  algorithm = EXCLUDED.algorithm,
  questions_blob = EXCLUDED.questions_blob,
  problem_html_blob = EXCLUDED.problem_html_blob,
  wrapped_key = EXCLUDED.wrapped_key,
  key_fingerprint = EXCLUDED.key_fingerprint,
  updated_at = NOW();
```

There is exactly one encrypted copy per quiz. Re-saving replaces it and invalidates the previous PDF.

### 5.3 What is not stored

- The teacher key.
- The raw DEK.
- Any plaintext question or HTML problem statement.
- Any user-visible key hint or recovery answer.

---

## 6. API endpoints

Base path: `/api/v1`

All admin endpoints require authentication and **quiz ownership** (`quiz.createdby === req.user.userId`). Collaborators are currently **not** allowed to read, save, unlock, or delete the encrypted copy.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/admin/quiz/:quizId/secure-payload/meta` | Owner | Returns whether an encrypted copy exists + non-secret metadata. |
| `GET` | `/admin/quiz/:quizId/secure-payload` | Owner | Returns the full ciphertext payload for unlocking. |
| `POST` | `/admin/quiz/:quizId/secure-payload` | Owner | Creates/replaces the encrypted copy. |
| `PUT` | `/admin/quiz/:quizId/secure-payload` | Owner | Alias for `POST` (same schema/handler). |
| `POST` | `/admin/quiz/:quizId/secure-payload/ack` | Owner | Clears `stale` after the studio finishes its own plaintext question sync. |
| `DELETE` | `/admin/quiz/:quizId/secure-payload` | Owner | Deletes the encrypted copy; plaintext quiz is unaffected. |
| `GET` | `/user/quiz/:quizId/secure-payload` | Signed-in user | Returns ciphertext for a published/non-draft quiz. |

All responses use the existing envelope:

```json
{ "success": true, "data": { } }
```

All successful secure responses set:

```http
Cache-Control: no-store, no-cache, must-revalidate, private
```

### 6.1 Metadata

`GET /api/v1/admin/quiz/123/secure-payload/meta`

Response when an encrypted copy exists:

```json
{
  "success": true,
  "data": {
    "exists": true,
    "quizId": 123,
    "payloadId": "123",
    "version": 1,
    "algorithm": "AES-256-GCM",
    "keyFingerprint": "64-lowercase-hex-characters",
    "stale": false,
    "staleAt": null,
    "createdAt": "2026-10-28T10:00:00.000Z",
    "updatedAt": "2026-10-28T10:00:00.000Z"
  }
}
```

`stale` becomes `true` when any `quiz_problems` or `quiz_problem_options` row is inserted, updated, or deleted after the encrypted copy was saved. `staleAt` records when it happened. The studio treats a stale copy like a missing one and asks for a fresh key PDF on the next explicit save.

Response when no copy exists:

```json
{ "success": true, "data": { "exists": false } }
```

`meta` never returns ciphertext or the wrapped key.

### 6.2 Full payload (owner unlock)

`GET /api/v1/admin/quiz/123/secure-payload`

Response `200`:

```json
{
  "success": true,
  "data": {
    "serverQuizId": 123,
    "quizId": "123",
    "version": 1,
    "algorithm": "AES-256-GCM",
    "keyFingerprint": "64-lowercase-hex-characters",
    "createdAt": "2026-10-28T10:00:00.000Z",
    "updatedAt": "2026-10-28T10:00:00.000Z",
    "questions": { "iv": "...", "ct": "..." },
    "problemHtml": { "iv": "...", "ct": "..." },
    "wrappedKey": { "iv": "...", "ct": "..." }
  }
}
```

Important: the payload's `quizId` is the **payload id used as AAD**, not necessarily the numeric server id. The repository aliases `payload_id AS "quizId"` and exposes the server id as `serverQuizId`. The frontend also normalizes older responses by preferring `payloadId` when present.

`404` if no encrypted copy exists.

### 6.3 Save payload

`POST` / `PUT /api/v1/admin/quiz/123/secure-payload`

Request: the payload shown in section 4.

Response `200` (metadata only, not the ciphertext):

```json
{
  "success": true,
  "data": {
    "exists": true,
    "quizId": 123,
    "payloadId": "123",
    "version": 1,
    "algorithm": "AES-256-GCM",
    "keyFingerprint": "64-lowercase-hex-characters",
    "createdAt": "2026-10-28T10:00:00.000Z",
    "updatedAt": "2026-10-28T10:00:00.000Z"
  }
}
```

`400` cases:

- Invalid quiz id.
- Zod validation failure (bad IV, short ct, bad fingerprint, unknown fields).
- `body.quizId !== String(owner.quizId)` → `"Encrypted payload does not match this quiz"`.

`403`: authenticated but not the quiz creator.
`404`: quiz not found.
`413`: body exceeds the app's `10mb` JSON limit.
`500`: database or unexpected error. Request bodies are never logged.

### 6.4 Delete payload

`DELETE /api/v1/admin/quiz/123/secure-payload`

```json
{ "success": true, "data": { "deleted": true } }
```

The plaintext quiz and its questions are not touched.

### 6.5 Participant ciphertext endpoint

`GET /api/v1/user/quiz/123/secure-payload`

- Requires authentication.
- Refuses missing quizzes (`404`) and `draft` quizzes (`403`).
- Returns the same ciphertext payload shape as the owner endpoint.
- Used by the student attempt and review pages. The participant receives the teacher's key out-of-band (PDF/QR); without it the payload is opaque.
- For legacy quizzes with no payload, the attempt/review pages fall back to the existing plaintext start/review responses.

---

## 7. Complete flows

### 7.1 Save / upload flow (teacher)

```text
Teacher presses Save / Publish
  → frontend validates questions
  → quiz setup saved (title, settings, participants, etc.)
  → GET /secure-payload/meta
  → decide: does the encrypted copy need to be created/replaced?
  → prepareQuiz() in the browser:
       - generate 32-byte KEK (64 hex chars) unless reusing
       - generate random 32-byte DEK
       - encrypt { title, questions } with DEK + AAD=quizId
       - encrypt { problemHtml } with DEK + AAD=quizId
       - wrap base64(DEK) with KEK + AAD=quizId
       - SHA-256(KEK) → keyFingerprint
  → SecureQuizKeyDialog opens
  → teacher downloads PDF (jsPDF + QR, generated locally)
  → teacher ticks "I have saved the key PDF"
  → dialog POSTs ciphertext + wrapped key to backend
  → backend validates, upserts one row (stale = false), returns metadata
  → dialog closes, save continues
  → plaintext questions sync (existing runtime) → assigns server ids and
    triggers mark stale = true
  → prepareQuiz() again with the SAME key; POST refreshed ciphertext so the
    payload includes the new server ids
  → POST /secure-payload/ack clears stale for this save
```

The first upload must happen before the plaintext sync because the teacher has
to own the key before any ciphertext leaves the browser. The second upload
re-encrypts the same content with the same key after the sync, so decrypted
questions/options can be matched to the attempt's server ids. If the refresh
upload fails, the copy stays stale and the next save prompts again.

If a question or option is later changed through any other question API, the database trigger sets `stale = true`. The next explicit Save/Publish sees `meta.stale` and re-encrypts the quiz with a new key.

If the teacher cancels the dialog:

- No ciphertext is uploaded.
- The save/publish action is cancelled (`SecureSaveCancelledError`).
- The in-memory/localStorage secure-dirty flag stays set, so the next explicit Save/Publish prompts again.

### 7.2 When is a new encrypted copy created?

The frontend calls `prepareQuiz` and shows the key dialog only if at least one is true:

- No encrypted copy exists (`meta.exists === false`).
- Questions changed since the last plaintext save (`changedIds.size > 0`).
- `secureContentDirtyRef` is set in this session.
- `studio_secure_dirty_<quizId>` is set in `localStorage` from a previous session.

The in-memory/localStorage flag is set by:

- AI question import (`importQuestionsAndSave`).
- Question deletion (`removeQuestion`).
- Question reordering (`reorderQuestions`).
- Any operation that persists plaintext question changes outside the normal save diff.

After a successful ciphertext upload, both flags are cleared.

Autosave, step navigation, and mobile "continue" actions do **not** pass `secure: true`; only explicit Save/Publish actions do. This avoids showing the key dialog during navigation.

### 7.3 Unlock flow (teacher)

```text
Teacher opens /creator/quizzes/:id/secure
  → GET /secure-payload/meta
  → if no copy: show "No encrypted copy yet"
  → teacher pastes PDF key
  → normalizeKeyHex() (strip spaces/dashes/colons/underscores)
  → GET /secure-payload (ciphertext)
  → SHA-256(pasted key) compared with payload.keyFingerprint
  → unwrap DEK with KEK + AAD=quizId
  → decrypt questions blob with DEK + AAD=quizId
  → decrypt problemHtml blob with DEK + AAD=quizId
  → render read-only preview
```

The key stays in React state for the current tab. It is cleared on "Lock", on unmount, and never persisted to storage or sent to the server.

### 7.4 Student attempt/review flow (key on every load)

```text
Student opens /quiz/:code/attempt
  → GET quiz metadata, then GET /user/quiz/:id/secure-payload
  → 404: legacy quiz → existing plaintext start/review flow
  → 200: show QuizKeyGate
  → student pastes PDF key
  → fingerprint check + unwrap DEK + decrypt in the browser
  → POST /start (or resume) returns shuffled problems with ids/order only
  → merge decrypted title/options/description by server id; fall back to
    authored_index for payloads created before server-id linking
  → if the page is refreshed, the ciphertext is fetched again and the key
    gate is shown again
```

The review page follows the same gate. The server still owns correctness:
review rows carry `iscorrect`, `selected_option`, and metadata, while the
browser restores only the authored question/option text and explanation.

### 7.5 Wrong key / tampered payload

- Wrong key → fingerprint mismatch → `"Could not unlock the quiz. The key is wrong or the encrypted copy is damaged."`
- Ciphertext tampering → AES-GCM authentication fails → same generic error.
- AAD mismatch (payload moved to another quiz) → AES-GCM authentication fails.
- Unsupported version/algorithm → explicit error.
- Malformed base64/IV/shape → `"Encrypted data is malformed."` or `"Encrypted quiz data is malformed."`

### 7.6 Key rotation

Every re-encryption generates a **new KEK**. The old PDF stops working as soon as the new payload is uploaded. The dialog warns about this when `meta.exists === true`. There is no server-side key rotation or recovery.

---

## 8. Frontend save decision details

`StudioProvider.saveToServer` handles the secure branch inside `if (!opts?.setupOnly)` after the quiz setup is saved and `changedIds` is computed:

```ts
let secureKeyHex: string | null = null;
let secureUploaded = false;
if (opts?.secure && state.questions.length > 0) {
  const meta = await getSecureQuizMeta(quizId);
  const needsSecureSave =
    secureContentDirtyRef.current ||
    readSecureDirty(quizId) ||
    meta.stale === true ||
    !meta.exists ||
    (changedIds?.size ?? 0) > 0;

  if (needsSecureSave) {
    const prepared = await prepareQuiz(
      { questions: state.questions, title: state.info.title },
      { quizId, title: state.info.title }
    );
    secureKeyHex = prepared.keyHex;

    await requestSecureKeyConfirmation({
      quizId,
      quizCode: savedCode,
      title: state.info.title,
      prepared,
      replacing: Boolean(meta.exists),
    });

    secureUploaded = true;
    secureContentDirtyRef.current = false;
    writeSecureDirty(quizId, false);
  }
}

// ...plaintext sync assigns server ids and marks the ciphertext stale...
if (secureUploaded && secureKeyHex) {
  const refreshed = await prepareQuiz(
    { questions: state.questions, title: state.info.title },
    { quizId, title: state.info.title, keyHex: secureKeyHex }
  );
  await saveSecureQuizPayload(quizId, refreshed.payload);
  await ackSecureQuizPayload(quizId);
}
```

The dialog itself performs the upload (`saveSecureQuizPayload`) only after the PDF has been downloaded and the checkbox confirmed.

Why this order:

- The teacher must possess the key before any ciphertext leaves the browser.
- If the upload fails, the dialog stays open and the save is blocked.
- A cancelled dialog does not silently create an encrypted copy with a key nobody saved.

---

## 9. Runtime storage: quiz questions encrypted at rest

The E2E encrypted copy remains **server-unreadable**. Separately, **quiz runtime questions only** are encrypted at rest with an application key:

- `quiz_problems` and `quiz_problem_options` store AES-256-GCM ciphertext
  (`enc:v1:<iv>:<tag>:<ciphertext>`) in their text columns.
- Repositories decrypt on read, so grading, review, analytics, and the quiz
  editor still receive plaintext.
- `QUIZ_CONTENT_ENCRYPTION_KEY` (or `AES_SECRET_KEY`) is held by the backend,
  therefore **database-only access cannot read quiz questions**, but the
  running server can. This is not full E2E for live quizzes.
- Existing rows are encrypted in place with
  `npm run encrypt:quiz-content` (idempotent; supports `--dry-run`).
- Question banks (`quiz_question_bank`, `subjective_question_bank`) and saved
  test papers are intentionally **not** encrypted in this phase.

If the product later needs **true E2E** for live quizzes:

- The participant client must receive ciphertext + a key delivery mechanism.
- Grading must move to the client or use a secure multi-party/zero-knowledge design.
- Leaderboard/result generation must change.
- Runtime plaintext handling in the server must be removed or restricted.

The accurate claim is: **the encrypted copy is unreadable by the backend; quiz runtime questions are encrypted at rest but decryptable by the app.**

---

## 10. Security rules

- **Never upload the teacher key or DEK.** Only ciphertext, wrapped DEK, fingerprint, and metadata.
- **Never log request bodies** for secure endpoints. The existing controller logs only the error object. Do not add body dumps, key dumps, or ciphertext dumps.
- **No-store caching** on every secure response.
- **Ownership check** on every admin secure endpoint. Current rule: creator only.
- **AAD binding**: `quizId` is authenticated; the controller also rejects a payload whose `quizId` does not match the route.
- **Zod validation** before DB work: exact IV length, ciphertext bounds, fingerprint format, strict fields.
- **No key recovery**: there is no password reset, support override, or admin decrypt path. Losing the PDF means losing the encrypted copy.
- **PDF is sensitive**: anyone with the PDF/QR can decrypt. The dialog and PDF both warn about this.
- **The unlock page is `noindex`** and renders only after the browser decrypts.
- **The fingerprint is not a secret**, but do not treat it as a replacement for the key.
- **Plaintext caveat**: see section 9 before making security claims.

---

## 11. Migration and setup

### 11.1 Apply the migration

The project uses `src/migrate.ts`:

```bash
cd code-judge-backend
npm run migrate
```

Or apply the SQL manually:

```bash
psql "$DATABASE_URL" -f database/migrations/64_secure_quiz_payloads.sql
psql "$DATABASE_URL" -f database/migrations/65_secure_quiz_payload_stale.sql
```

Verify:

```sql
\d quiz_secure_payloads
```

Expected: `quiz_id` primary key, three JSONB blobs, `key_fingerprint CHAR(64)`, `stale BOOLEAN`, `stale_at TIMESTAMPTZ`, timestamp columns, check constraints, and `idx_quiz_secure_payloads_updated_at`. Migration 65 also creates `trg_quiz_problems_secure_stale` and `trg_quiz_problem_options_secure_stale`.

### 11.2 Environment

No new environment variables are required. The feature uses:

- Existing Postgres connection (`DATABASE_URL` / existing DB config).
- Existing auth middleware.
- Existing `10mb` JSON body limit in `src/app.ts`.

### 11.3 Frontend dependencies

Already present:

- `jspdf` for PDF generation.
- `qrcode` for the key QR.
- WebCrypto (`globalThis.crypto.subtle`) for AES-GCM/SHA-256.

No server-side crypto package is needed.

---

## 12. Testing

### 12.1 Backend compile

```bash
cd code-judge-backend
npm run build
```

### 12.2 Frontend crypto acceptance test

```bash
cd code-judge-frontend
npm run test:crypto
```

Covers:

- 64-hex key generation/normalization/formatting.
- Payload contains no plaintext question content.
- Unlock round-trip restores questions and `problemHtml`.
- Wrong key rejects.
- AAD mismatch rejects.
- Invalid keys reject.
- Key reuse works.
- `problemHtml` override works.
- Cancelled-save error helper works.

### 12.3 Frontend typecheck

```bash
cd code-judge-frontend
npx tsc --noEmit
```

### 12.4 Schema cross-check

The frontend payload should parse with the backend Zod schema:

```bash
cd code-judge-backend
npx tsx -e "
import { secureQuizPayloadSchema } from './src/middleware/validate.ts';
import { prepareQuiz } from '../code-judge-frontend/src/lib/quizCrypto.ts';
void (async () => {
  const prepared = await prepareQuiz(
    { questions: [{ id: 'q1', title: '2+2?', options: [] }], title: 'Test' },
    { quizId: '123' }
  );
  const parsed = secureQuizPayloadSchema.parse(prepared.payload);
  console.log('schema ok', parsed.quizId, parsed.questions.iv.length, parsed.questions.ct.length);
})();
"
```

Expected: `schema ok 123 16 <ct-length>` (or at least no Zod error).

### 12.5 Manual end-to-end check

1. Apply migration 64.
2. Open Quiz Studio for a quiz with questions.
3. Press **Save**.
4. Verify the key dialog appears.
5. Download the PDF; verify it contains the grouped key and QR.
6. Tick the checkbox; press **Save encrypted copy**.
7. Verify `quiz_secure_payloads` has one row for the quiz with non-empty `questions_blob`, `problem_html_blob`, `wrapped_key`.
8. Verify the plaintext quiz still loads in the editor/player (existing behavior).
9. Open `/creator/quizzes/:id/secure`.
10. Paste the PDF key; verify questions decrypt and render.
11. Try a wrong key; verify the generic unlock error.
12. Edit a question, Save again, download the new PDF; verify the old key no longer unlocks the new payload.
13. Edit a question through a non-studio API and check `GET /secure-payload/meta`; verify `stale` is `true` and `staleAt` is set.
14. Save from the studio; verify the new payload is uploaded and `stale` returns to `false` after the sync completes.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `No encrypted copy exists for this quiz` | Quiz was never saved with the secure flow, or DELETE was called. | Save/Publish from the editor and confirm the key PDF. |
| Unlock says the key is wrong | Wrong PDF, or the quiz was re-encrypted after the PDF was downloaded. | Use the newest PDF. Re-saving creates a new key. |
| `"Encrypted quiz data is malformed."` | Full payload response returned the numeric server id instead of the payload id, or the blob shape is corrupt. | Ensure the repository aliases `payload_id AS "quizId"`; keep the frontend `payloadId` fallback. |
| `"This encrypted quiz uses an unsupported algorithm."` | DB row has a non-`AES-256-GCM` algorithm. | Only version 1 / AES-256-GCM is supported. |
| `"This encrypted quiz was saved with an unsupported version."` | Payload version is not `1`. | Migrate the payload or re-save with the current frontend. |
| `403 You can only access your own quiz` | Logged-in user is not the creator (collaborators are not supported). | Use the creator account. |
| `404` on participant endpoint | Quiz is missing or has no encrypted copy. | Publish/save the encrypted copy as the owner. |
| `403` on participant endpoint | Quiz is still `draft`. | Publish the quiz. |
| `413 Payload Too Large` | Ciphertext exceeds the `10mb` JSON limit. | Reduce question count/HTML size; raise the limit only after checking memory and abuse impact. |
| Dialog says upload failed | Network/API error. | Retry; the save is blocked until the ciphertext upload succeeds. |
| Old PDF stopped working | Questions changed and the encrypted copy was replaced with a new key. | Use the latest PDF. There is no recovery for the old copy. |
| Save doesn't prompt for a key | `secure` was not passed (autosave/navigation), or meta exists and no changes/dirty flag. | Use the explicit Save/Publish button. Check `secureContentDirty` / localStorage flag. |

---

## 14. Operational notes

- **Backups**: `quiz_secure_payloads` contains only ciphertext; a DB backup does not expose questions. The key PDFs are the only way to decrypt.
- **Deletion**: deleting a quiz cascades and removes its encrypted payload. Deleting the payload alone leaves the quiz intact.
- **Monitoring**: 500s from secure endpoints should not include request bodies in logs. If adding metrics, count requests/bytes, not content.
- **Storage growth**: base64 + JSONB overhead means the encrypted copy can be noticeably larger than the plaintext. The `10mb` request limit is the guardrail.
- **Rate limiting**: secure endpoints are authenticated and not special-cased; existing global/auth rate limits apply.
- **Cache/CDN**: never cache secure responses. The `no-store` header is set by the controller; do not add a public cache rule in front.
- **Key PDF handling**: treat the PDF like a password. Support cannot recover it.

---

## 15. Future improvements

1. **Server-side secure-dirty flag**: the current `localStorage` flag only covers the same browser. A backend flag toggled by plaintext question writes would catch cross-device/collaborator edits and force re-encryption more reliably.
2. **Collaborator access**: currently only the creator can read/save/unlock. If collaborators need access, decide whether they share the key PDF or get a separate wrapping.
3. **Key rotation UI**: allow downloading a new key without re-encrypting all content (rewrap the DEK with a new KEK).
4. **Audit events**: record `created`/`replaced`/`deleted` events without ciphertext or key material.
5. **Participant client**: build the client-side player that consumes the participant ciphertext endpoint and receives the key through a separate channel.
6. **True E2E runtime**: only if grading/live features are redesigned to avoid server-side plaintext.
7. **Automated backend tests**: add integration tests for ownership, draft rejection, AAD mismatch, and upsert replacement.

---

## 16. Quick reference

```text
Save:   browser encrypts → key PDF → confirm → POST ciphertext → plaintext sync → ack
Unlock: GET ciphertext → paste key → SHA-256 fingerprint check → unwrap DEK → decrypt
Meta:   exists + version + algorithm + fingerprint + stale + timestamps (no ciphertext)
Stale:  any question/option write → stale = true; fresh upload or ack → stale = false
Delete: removes encrypted copy only; plaintext quiz unaffected
Key:    64 hex chars = 32 bytes; never uploaded
Crypto: AES-256-GCM, 12-byte IV, AAD = quizId
DB:     quiz_secure_payloads, one row per quiz
Cache:  no-store on every secure response
```
