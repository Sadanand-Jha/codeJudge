-- Allow retakes while preventing two simultaneous active attempts.
ALTER TABLE quiz_attempt
  DROP CONSTRAINT IF EXISTS uq_user_quiz_attempt;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempt_active
  ON quiz_attempt (user_id, quiz_id)
  WHERE status = 'in_progress';
