-- 06_quiz_response_is_attempted.sql
-- Bring quiz_student_response in line with what the save-response code
-- reads and writes. All statements are idempotent so the migration is
-- safe to re-run.
--
-- Without this column:
--   POST /api/v1/user/quiz/attempt/:attemptId/save fails with
--   'column "is_attempted" of relation "quiz_student_response" does not exist'
--   -> API returns 500 "Internal server error while saving response".
-- The column exists in the intended schema (01_quiz.sql) but is missing
-- on databases created from the older table definition.

ALTER TABLE quiz_student_response
  ADD COLUMN IF NOT EXISTS is_attempted BOOLEAN NOT NULL DEFAULT FALSE;
