-- Trial tracking plus the append-only usage and credit ledgers used by the
-- entitlement resolver and the server-side guards.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE users
  ALTER COLUMN trial_started_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET trial_started_at = COALESCE(
      created_at,
      createdat,
      CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
    ) AT TIME ZONE 'UTC'
WHERE trial_started_at IS NULL;

CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL
    CHECK (event_type IN ('quiz_created', 'email_sent')),
  ref_id VARCHAR(100),
  order_id BIGINT REFERENCES orders (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_type_created
  ON usage_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_created
  ON usage_events (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_events_quiz_ref
  ON usage_events (ref_id)
  WHERE event_type = 'quiz_created' AND ref_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  order_id BIGINT REFERENCES orders (id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason VARCHAR(40) NOT NULL,
  ref_id VARCHAR(100),
  balance_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_order
  ON credit_transactions (order_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_ref
  ON credit_transactions (user_id, ref_id);
