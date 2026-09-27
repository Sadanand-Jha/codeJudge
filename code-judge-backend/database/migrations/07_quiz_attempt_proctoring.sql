-- 07_quiz_attempt_proctoring.sql
-- Exam-cell (anti-cheating) support for student quiz attempts.
-- The frontend reports proctoring violations (tab switch, window blur,
-- fullscreen exit, copy/paste attempts) per attempt. After 3 violations the
-- attempt is auto-submitted and marked flagged for examiner review.
-- All statements are idempotent so the migration is safe to re-run.

ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS violations INTEGER NOT NULL DEFAULT 0;

ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE quiz_attempt
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_flagged ON quiz_attempt(flagged);
