-- 12_quiz_relational_integrity.sql
--
-- Complete the relational integrity rules for the live quiz schema.
-- This migration is intentionally idempotent because some environments were
-- bootstrapped from init.sql while others received the numbered migrations.
--
-- Important relationships enforced here include:
--   quiz_attempt.user_id                    -> users.id
--   quiz_student_response.attempt_id        -> quiz_attempt.id (already present
--                                               on healthy databases; retained)
--   quiz_student_response.problem_id        -> quiz_problems.id
--   quiz_participants.user_id/status        -> users/status lookup
--   quiz.exam_cat/subject_id                -> their lookup tables

-- The original 01 migration declared this lookup after deployments had
-- already diverged. Recreate it before adding the participant status FK.
CREATE TABLE IF NOT EXISTS quiz_participant_status (
  id INTEGER PRIMARY KEY,
  status VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO quiz_participant_status (id, status)
VALUES (1, 'allowed'), (2, 'not_allowed')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Normalize fields before making their nullability explicit.
UPDATE quiz_registration SET is_registered = FALSE WHERE is_registered IS NULL;
UPDATE quiz_problem_options SET iscorrect = FALSE WHERE iscorrect IS NULL;

ALTER TABLE quiz_registration
  ALTER COLUMN is_registered SET DEFAULT FALSE,
  ALTER COLUMN is_registered SET NOT NULL;

ALTER TABLE quiz_problem_options
  ALTER COLUMN problem_id SET NOT NULL,
  ALTER COLUMN iscorrect SET DEFAULT FALSE,
  ALTER COLUMN iscorrect SET NOT NULL;

-- Missing foreign keys. Constraint existence is checked through pg_constraint
-- because PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attempt_user') THEN
    ALTER TABLE quiz_attempt
      ADD CONSTRAINT fk_attempt_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_response_attempt') THEN
    ALTER TABLE quiz_student_response
      ADD CONSTRAINT fk_response_attempt
      FOREIGN KEY (attempt_id) REFERENCES quiz_attempt(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_response_problem') THEN
    ALTER TABLE quiz_student_response
      ADD CONSTRAINT fk_response_problem
      FOREIGN KEY (problem_id) REFERENCES quiz_problems(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_participant_user') THEN
    ALTER TABLE quiz_participants
      ADD CONSTRAINT fk_quiz_participant_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_participant_status') THEN
    ALTER TABLE quiz_participants
      ADD CONSTRAINT fk_quiz_participant_status
      FOREIGN KEY (status) REFERENCES quiz_participant_status(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_exam_category') THEN
    ALTER TABLE quiz
      ADD CONSTRAINT fk_quiz_exam_category
      FOREIGN KEY (exam_cat) REFERENCES exam_categories(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quiz_subject') THEN
    ALTER TABLE quiz
      ADD CONSTRAINT fk_quiz_subject
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Natural/business uniqueness.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_quiz_code') THEN
    ALTER TABLE quiz ADD CONSTRAINT uq_quiz_code UNIQUE (code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_attempt_problem') THEN
    ALTER TABLE quiz_student_response
      ADD CONSTRAINT uq_attempt_problem UNIQUE (attempt_id, problem_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_quiz_participant_quiz_user') THEN
    ALTER TABLE quiz_participants
      ADD CONSTRAINT uq_quiz_participant_quiz_user UNIQUE (quiz_id, user_id);
  END IF;
END $$;

-- Active question numbers must be stable inside a quiz. Soft-deleted questions
-- do not block reuse of their old sequence number.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_active_question_number
  ON quiz_problems (quiz_id, question_number)
  WHERE deleted_at IS NULL AND question_number IS NOT NULL;

-- Domain checks for values consumed by scoring, timing, and UI logic.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_marks') THEN
    ALTER TABLE quiz ADD CONSTRAINT chk_quiz_marks CHECK (
      (total_marks IS NULL OR total_marks >= 0) AND
      (passing_marks IS NULL OR passing_marks >= 0) AND
      (total_marks IS NULL OR passing_marks IS NULL OR passing_marks <= total_marks)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_duration') THEN
    ALTER TABLE quiz ADD CONSTRAINT chk_quiz_duration
      CHECK (duration IS NULL OR duration > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_schedule') THEN
    ALTER TABLE quiz ADD CONSTRAINT chk_quiz_schedule
      CHECK (starttime IS NULL OR endtime IS NULL OR endtime > starttime);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_problem_values') THEN
    ALTER TABLE quiz_problems ADD CONSTRAINT chk_quiz_problem_values CHECK (
      (question_number IS NULL OR question_number > 0) AND
      (marks IS NULL OR marks >= 0) AND
      (negative_marks IS NULL OR negative_marks >= 0)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_attempt_status') THEN
    ALTER TABLE quiz_attempt ADD CONSTRAINT chk_quiz_attempt_status
      CHECK (status IN ('in_progress', 'completed', 'timed_out'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_attempt_counts') THEN
    ALTER TABLE quiz_attempt ADD CONSTRAINT chk_quiz_attempt_counts CHECK (
      total_questions >= 0 AND correct_answers >= 0 AND wrong_answers >= 0 AND
      skipped_questions >= 0 AND violations >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_attempt_percentage') THEN
    ALTER TABLE quiz_attempt ADD CONSTRAINT chk_quiz_attempt_percentage
      CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_attempt_time_rank') THEN
    ALTER TABLE quiz_attempt ADD CONSTRAINT chk_quiz_attempt_time_rank CHECK (
      (time_taken IS NULL OR time_taken >= 0) AND (rank IS NULL OR rank > 0)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_response_time') THEN
    ALTER TABLE quiz_student_response ADD CONSTRAINT chk_quiz_response_time
      CHECK (time_spent_seconds >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_participant_source') THEN
    ALTER TABLE quiz_participants ADD CONSTRAINT chk_quiz_participant_source
      CHECK (source IS NULL OR source IN (1, 2));
  END IF;
END $$;

-- A pair of individually valid FKs could still connect an attempt from quiz A
-- to a problem from quiz B. Enforce the cross-table invariant at write time.
CREATE OR REPLACE FUNCTION enforce_quiz_response_problem_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_quiz_id INTEGER;
  problem_quiz_id INTEGER;
BEGIN
  SELECT quiz_id INTO attempt_quiz_id FROM quiz_attempt WHERE id = NEW.attempt_id;
  SELECT quiz_id INTO problem_quiz_id FROM quiz_problems WHERE id = NEW.problem_id;

  IF attempt_quiz_id IS NOT NULL
     AND problem_quiz_id IS NOT NULL
     AND attempt_quiz_id <> problem_quiz_id THEN
    RAISE EXCEPTION
      'quiz response problem % belongs to quiz %, but attempt % belongs to quiz %',
      NEW.problem_id, problem_quiz_id, NEW.attempt_id, attempt_quiz_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_response_problem_scope ON quiz_student_response;
CREATE TRIGGER trg_quiz_response_problem_scope
  BEFORE INSERT OR UPDATE OF attempt_id, problem_id
  ON quiz_student_response
  FOR EACH ROW
  EXECUTE FUNCTION enforce_quiz_response_problem_scope();

-- Supporting indexes for every frequently joined foreign-key column.
CREATE INDEX IF NOT EXISTS idx_quiz_exam_cat ON quiz(exam_cat);
CREATE INDEX IF NOT EXISTS idx_quiz_subject_id ON quiz(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_user_id ON quiz_attempt(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_quiz_id ON quiz_attempt(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_response_attempt_id ON quiz_student_response(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_response_problem_id ON quiz_student_response(problem_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_user_id ON quiz_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_status ON quiz_participants(status);
CREATE INDEX IF NOT EXISTS idx_quiz_registration_quiz_id ON quiz_registration(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_registration_user_id ON quiz_registration(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_problem_id ON quiz_problem_options(problem_id);
CREATE INDEX IF NOT EXISTS idx_quiz_game_mechanics_mechanic_id ON quiz_game_mechanics(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_quiz_report_jobs_quiz_id ON quiz_report_jobs(quiz_id);
