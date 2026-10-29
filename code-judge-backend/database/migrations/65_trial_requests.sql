-- User-requested Basic trials. A trial is granted only after an owner
-- approves the request, which starts a 7-day subscription and grants the
-- Basic plan's AI credits as a paid, zero-value order.

CREATE TABLE IF NOT EXISTS trial_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  request_note TEXT CHECK (request_note IS NULL OR char_length(request_note) <= 500),
  review_note TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  reviewed_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  credits_granted INTEGER NOT NULL DEFAULT 0 CHECK (credits_granted >= 0),
  subscription_id INTEGER REFERENCES subscriptions (id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES orders (id) ON DELETE SET NULL
);

-- One open request per user, and only one approved trial in a lifetime.
CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_requests_pending_user
  ON trial_requests (user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_trial_requests_approved_user
  ON trial_requests (user_id)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_trial_requests_status_requested
  ON trial_requests (status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_trial_requests_user_requested
  ON trial_requests (user_id, requested_at DESC);
