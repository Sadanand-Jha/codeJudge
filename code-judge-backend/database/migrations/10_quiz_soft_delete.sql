-- Quiz deletion is intentionally reversible. Related questions, attempts,
-- responses, participants, and analytics remain intact.
ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_quiz_active
  ON quiz (id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_creator_active
  ON quiz (createdby, created_at DESC)
  WHERE deleted_at IS NULL;
