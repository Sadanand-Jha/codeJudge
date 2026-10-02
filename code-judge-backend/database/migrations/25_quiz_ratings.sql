-- Anonymous quiz ratings.
-- A learner may rate a quiz only once, and every rating is tied to a
-- completed attempt for eligibility/audit purposes. Creator APIs expose only
-- aggregate values; user_id and attempt_id are never returned to creators.

SET TIME ZONE 'Asia/Kolkata';

CREATE TABLE IF NOT EXISTS quiz_rating (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quiz_id INTEGER NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id INTEGER NOT NULL REFERENCES quiz_attempt(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'),
  CONSTRAINT uq_quiz_rating_user_quiz UNIQUE (user_id, quiz_id),
  CONSTRAINT uq_quiz_rating_attempt UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_rating_quiz_id ON quiz_rating(quiz_id);

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON quiz_rating;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON quiz_rating
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_kolkata();
