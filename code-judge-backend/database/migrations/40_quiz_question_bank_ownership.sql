-- Question-bank ownership + HTML rendering support.
--
-- Every generated question belongs to the creator who generated it for 7
-- days. After that window it is transferred to the system bank (`owner_type =
-- 'system'`, `owner_user_id = NULL`) and disappears from the creator's bank.
-- `question_html` stores the sanitized HTML rendering (real tables, lists,
-- code blocks) while `question_text` stays as searchable plain text.
ALTER TABLE quiz_question_bank
    ADD COLUMN IF NOT EXISTS question_html TEXT,
    ADD COLUMN IF NOT EXISTS owner_user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS owner_type VARCHAR(16) NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS ownership_expires_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_quiz_question_bank_owner_type'
    ) THEN
        ALTER TABLE quiz_question_bank
            ADD CONSTRAINT chk_quiz_question_bank_owner_type
            CHECK (owner_type IN ('user', 'system'));
    END IF;
END;
$$;

-- Backfill rows created before ownership existed: their creator owns them for
-- 7 days from creation, and rows without a creator already belong to system.
UPDATE quiz_question_bank
SET owner_user_id = created_by,
    owner_type = 'user'
WHERE owner_user_id IS NULL
  AND created_by IS NOT NULL
  AND owner_type = 'user';

UPDATE quiz_question_bank
SET ownership_expires_at = created_at + INTERVAL '7 days'
WHERE ownership_expires_at IS NULL;

UPDATE quiz_question_bank
SET owner_user_id = NULL,
    owner_type = 'system'
WHERE owner_user_id IS NULL;

ALTER TABLE quiz_question_bank
    ALTER COLUMN ownership_expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

ALTER TABLE quiz_question_bank
    ALTER COLUMN ownership_expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_owner
ON quiz_question_bank(owner_type, owner_user_id, ownership_expires_at);
