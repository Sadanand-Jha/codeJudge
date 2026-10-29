# Quiz Encryption (KEK + DEK)

Quiz question content is encrypted in the browser before it is uploaded. The
server stores ciphertext plus the identifiers and correctness markers it needs
to run and grade an attempt. It never receives the plaintext title, options,
hints, explanations, media references, or the answer key.

## What the server can see

- Question and option identifiers, authored order, marks, difficulty, type.
- `iscorrect` for each option (needed for grading and review).
- SHA-256 `answer_hash` for text-like answers (fill in the blanks, match,
  short text, paragraph, code output).
- Ciphertext (`payload_ct`) and the AAD identifier (`payload_aad_id`).
- For students, IDs/order/marks only. Correctness flags, answer hashes, and the
  wrapped DEK are removed before the response leaves the server.

## Keys

- Each account has one KEK (key-encryption key), derived in the browser with
  PBKDF2-HMAC-SHA-256 (at least 600,000 iterations, 16-byte salt) from the
  teacher's passphrase. `kek_check` lets the browser verify the passphrase.
- The KEK is never uploaded. It lives in memory for 30 idle minutes and is
  cleared on lock, logout, or tab close.
- Each quiz has a random 32-byte DEK (data-encryption key). The DEK is wrapped
  with the KEK and stored as `quiz.wrapped_dek`.
- Question payloads use AES-256-GCM with AAD
  `quiz:<quizId>|q:<payloadAadId>|payload|v1`.
- The wrapped DEK uses AAD `quiz:<quizId>|dek|v1`.
- Envelopes are base64url `{ v: 1, alg: "A256GCM", iv, ct }`.

Re-saving a quiz reuses its existing DEK. There is currently no KEK rotation:
`PUT /quiz-crypto/kek` returns 409 once a KEK exists. Losing the passphrase
means the encrypted copies cannot be recovered; the server cannot reset it.

## Student link

The teacher creates a link from **Encrypted quiz copy**:

```
/q/<quizCode>#<base64url-dek>
```

The fragment is read by the browser, stored in `sessionStorage` under
`quiz_dek_<numericQuizId>`, and removed from the URL with
`history.replaceState`. Reloads in the same tab keep working; opening the link
in another tab or device requires the full link again. The fragment is never
sent in HTTP requests.

## Flows

### Teacher save

1. `GET /v1/user/quiz-crypto/kek` determines setup or unlock.
2. The browser derives/unlocks the KEK.
3. Existing DEK is unwrapped (or a new one is generated and wrapped).
4. Each question is encrypted and uploaded with option correctness markers and
   answer hashes to `PUT /v1/admin/quiz/:quizId/client-crypto`.
5. The server nulls legacy plaintext columns in the same transaction.

### Student attempt

1. The student opens `/q/<code>#<dek>`.
2. `GET /v1/user/quiz/:quizId/client-crypto` returns ciphertext and option IDs.
3. The browser decrypts all payloads and merges the text into the ID/order-only
   attempt payload returned by `POST /v1/user/quiz/:quizId/start`.
4. Answers are submitted as option IDs or normalized text, as before.

### Review

Review rows for encrypted quizzes contain `payload_ct`, `payload_aad_id`, and
option ID/correctness. The browser decrypts the authored text. Students with a
completed attempt can fetch the ciphertext after the quiz ends so the review
can be rendered; the normal review availability window still applies.

## Grading

- Choice questions: the server compares submitted option IDs with `iscorrect`.
- Text-like questions: the browser hashes normalized accepted answers
  (`trim`, lowercase, collapse whitespace) with SHA-256. The server hashes the
  normalized submission and compares it with `answer_hash`, and also accepts
  legacy plaintext answers until they are re-saved.
- Known caveat: match-following answers may be submitted as option IDs rather
  than text. Those attempts keep the legacy comparison path; verify match
  grading after converting an old quiz.
- Results, scores, and marksheets contain only numbers and identifiers, so the
  server can keep generating and emailing them.

## Current limitations

- Encryption covers quiz question content only. The question bank, AI
  generation history, papers, and other features remain unchanged.
- AI-generated questions are still written to the question bank as plaintext
  when a subject is selected. Only the quiz copy is encrypted.
- Legacy `/secure-payload` quizzes (AES key in a PDF) still use the old key
  gate. Opening or re-saving such a quiz from Studio converts it to the KEK/DEK
  format; the old snapshot rows are left in place and are no longer read once
  `crypto_version = 1`.
- Any feature that renders question text outside the browser (server-side PDFs,
  previews, exports) must either be generated client-side or be disabled for
  encrypted quizzes.
- The secure link is a bearer capability: anyone who has it can decrypt the
  quiz. Share it only through trusted channels.

## Endpoints

- `GET/PUT /v1/user/quiz-crypto/kek` - account KEK configuration.
- `GET/PUT /v1/admin/quiz/:quizId/client-crypto` - teacher ciphertext.
- `GET /v1/user/quiz/:quizId/client-crypto` - student ciphertext (no answer
  data).
