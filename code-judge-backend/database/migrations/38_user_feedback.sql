-- user_feedback: product feedback submitted by signed-in users from the
-- public contact page. Categories are validated at the API layer against
-- src/constants/feedback.ts (keep the list in sync with the frontend).

CREATE TABLE IF NOT EXISTS user_feedback (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    VARCHAR(32) NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at
    ON user_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_category
    ON user_feedback (category);
