-- Per-question usage tracking.
--
-- A question's usage count increases every time it is included in a paper
-- downloaded as a PDF. This is a strong signal that teachers like the
-- question, so it can later be used to rank or recommend bank questions.
ALTER TABLE quiz_question_bank
    ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_quiz_question_bank_usage_count'
    ) THEN
        ALTER TABLE quiz_question_bank
            ADD CONSTRAINT chk_quiz_question_bank_usage_count
            CHECK (usage_count >= 0);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_quiz_question_bank_usage_count
ON quiz_question_bank(usage_count DESC);
