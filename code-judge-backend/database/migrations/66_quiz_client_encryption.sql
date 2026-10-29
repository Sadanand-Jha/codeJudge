-- Browser-side quiz encryption (KEK + DEK), server-blind question text.
--
-- The teacher's browser derives a KEK from a passphrase (PBKDF2) and stores
-- only the salt/KDF parameters plus a small KEK-check envelope on the user.
-- Each encrypted quiz stores a DEK wrapped by that KEK and one payloadCt
-- envelope per question. Question/option text, media references and
-- explanations never leave the browser in plaintext. The server keeps only
-- identifiers, ordering, marks and correctness markers needed for grading.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kek_salt TEXT,
  ADD COLUMN IF NOT EXISTS kek_kdf JSONB,
  ADD COLUMN IF NOT EXISTS kek_check JSONB;

ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS crypto_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrapped_dek JSONB;

ALTER TABLE quiz_problems
  ADD COLUMN IF NOT EXISTS payload_ct JSONB,
  ADD COLUMN IF NOT EXISTS payload_aad_id VARCHAR(128);

ALTER TABLE quiz_problem_options
  ADD COLUMN IF NOT EXISTS answer_hash CHAR(64);

ALTER TABLE quiz
  DROP CONSTRAINT IF EXISTS quiz_crypto_version_chk;
ALTER TABLE quiz
  ADD CONSTRAINT quiz_crypto_version_chk
  CHECK (crypto_version IN (0, 1));

ALTER TABLE quiz
  DROP CONSTRAINT IF EXISTS quiz_wrapped_dek_chk;
ALTER TABLE quiz
  ADD CONSTRAINT quiz_wrapped_dek_chk
  CHECK (
    wrapped_dek IS NULL
    OR (
      jsonb_typeof(wrapped_dek) = 'object'
      AND wrapped_dek ? 'v'
      AND wrapped_dek ? 'alg'
      AND wrapped_dek ? 'iv'
      AND wrapped_dek ? 'ct'
    )
  );

ALTER TABLE quiz_problems
  DROP CONSTRAINT IF EXISTS quiz_problem_payload_ct_chk;
ALTER TABLE quiz_problems
  ADD CONSTRAINT quiz_problem_payload_ct_chk
  CHECK (
    payload_ct IS NULL
    OR (
      jsonb_typeof(payload_ct) = 'object'
      AND payload_ct ? 'v'
      AND payload_ct ? 'alg'
      AND payload_ct ? 'iv'
      AND payload_ct ? 'ct'
    )
  );

ALTER TABLE quiz_problem_options
  DROP CONSTRAINT IF EXISTS quiz_option_answer_hash_chk;
ALTER TABLE quiz_problem_options
  ADD CONSTRAINT quiz_option_answer_hash_chk
  CHECK (answer_hash IS NULL OR answer_hash ~ '^[0-9a-f]{64}$');

CREATE INDEX IF NOT EXISTS idx_quiz_problems_payload_aad
  ON quiz_problems (payload_aad_id)
  WHERE payload_aad_id IS NOT NULL;
