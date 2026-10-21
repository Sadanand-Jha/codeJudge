ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_active
  ON quiz_attempt (quiz_id, user_id)
  WHERE deleted_at IS NULL;