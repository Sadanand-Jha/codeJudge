-- Anonymous teacher/creator quality signal submitted with immutable quiz feedback.
ALTER TABLE quiz_rating
  ADD COLUMN IF NOT EXISTS teacher_rating SMALLINT;

ALTER TABLE quiz_rating
  DROP CONSTRAINT IF EXISTS quiz_rating_teacher_rating_check;

ALTER TABLE quiz_rating
  ADD CONSTRAINT quiz_rating_teacher_rating_check
    CHECK (teacher_rating IS NULL OR teacher_rating BETWEEN 1 AND 5);
