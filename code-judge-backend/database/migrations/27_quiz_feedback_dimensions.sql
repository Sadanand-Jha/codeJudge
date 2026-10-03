-- Compact multi-dimensional learner feedback captured after a completed quiz.
-- `rating` remains the overall quiz score for backwards-compatible creator
-- aggregates. Platform operators can additionally inspect anonymous question,
-- product-experience, and written feedback signals.

ALTER TABLE quiz_rating
  ADD COLUMN IF NOT EXISTS question_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS platform_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS feedback VARCHAR(600);

ALTER TABLE quiz_rating
  DROP CONSTRAINT IF EXISTS quiz_rating_question_rating_check,
  DROP CONSTRAINT IF EXISTS quiz_rating_platform_rating_check;

ALTER TABLE quiz_rating
  ADD CONSTRAINT quiz_rating_question_rating_check
    CHECK (question_rating IS NULL OR question_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT quiz_rating_platform_rating_check
    CHECK (platform_rating IS NULL OR platform_rating BETWEEN 1 AND 5);
