-- 04_quiz_attempt.sql
-- Bring the quiz_attempt table (created in 01_quiz.sql) in line with the
-- columns the attempt/response code reads and writes. All statements are
-- idempotent so the migration is safe to re-run.
--
-- Without these columns:
--   POST /api/v1/user/quiz/:quizId/start  fails (INSERT references total_questions)
--   POST /api/v1/user/quiz/attempt/:id/submit fails (UPDATE references score, ...)
-- so no attempt row and no student responses were ever stored.

ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS time_taken INTEGER;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS correct_answers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS wrong_answers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS skipped_questions INTEGER NOT NULL DEFAULT 0;

-- Normalize the status default to the lowercase value the code writes
-- ('in_progress' / 'completed'). Existing rows are left untouched.
ALTER TABLE quiz_attempt ALTER COLUMN status SET DEFAULT 'in_progress';

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_user_quiz ON quiz_attempt(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_status ON quiz_attempt(status);
