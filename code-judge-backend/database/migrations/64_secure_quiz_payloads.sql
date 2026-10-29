-- Client-side end-to-end encrypted quiz content.
--
-- The browser encrypts the questions and HTML problem statements with a
-- random data key, then wraps that data key with the teacher's 64-hex key.
-- The server stores only ciphertext and the wrapped key; the teacher's key is
-- downloaded as a PDF and is never uploaded. AES-GCM authentication binds each
-- blob to the payload id via additional authenticated data.

CREATE TABLE IF NOT EXISTS quiz_secure_payloads (
  quiz_id           INTEGER PRIMARY KEY REFERENCES quiz(id) ON DELETE CASCADE,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payload_id        VARCHAR(128) NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  algorithm         VARCHAR(32) NOT NULL DEFAULT 'AES-256-GCM',
  questions_blob    JSONB NOT NULL,
  problem_html_blob JSONB NOT NULL,
  wrapped_key       JSONB NOT NULL,
  key_fingerprint   CHAR(64) NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT quiz_secure_payloads_version_chk
    CHECK (version >= 1),
  CONSTRAINT quiz_secure_payloads_fingerprint_chk
    CHECK (key_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT quiz_secure_payloads_questions_chk
    CHECK (
      jsonb_typeof(questions_blob) = 'object'
      AND questions_blob ? 'iv'
      AND questions_blob ? 'ct'
    ),
  CONSTRAINT quiz_secure_payloads_problem_html_chk
    CHECK (
      jsonb_typeof(problem_html_blob) = 'object'
      AND problem_html_blob ? 'iv'
      AND problem_html_blob ? 'ct'
    ),
  CONSTRAINT quiz_secure_payloads_wrapped_key_chk
    CHECK (
      jsonb_typeof(wrapped_key) = 'object'
      AND wrapped_key ? 'iv'
      AND wrapped_key ? 'ct'
    )
);

CREATE INDEX IF NOT EXISTS idx_quiz_secure_payloads_updated_at
  ON quiz_secure_payloads (updated_at DESC);
