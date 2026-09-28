-- Quiz problem deletion is reversible. Options and student responses remain
-- attached so historical attempts and analytics retain their source data.
ALTER TABLE quiz_problems
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_quiz_problems_active
  ON quiz_problems (quiz_id, question_number, id)
  WHERE deleted_at IS NULL;
