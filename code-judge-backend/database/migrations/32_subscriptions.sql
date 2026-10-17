-- User subscriptions and per-subscription overrides.
-- All timestamps are TIMESTAMPTZ (absolute instants, stored as UTC internally)
-- and rendered in Asia/Kolkata by the API layer.

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans (id),
  price_id INTEGER REFERENCES plan_prices (id),
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  source VARCHAR(20) NOT NULL DEFAULT 'self_serve'
    CHECK (source IN ('self_serve', 'admin_assigned', 'coupon', 'migration')),
  gateway_subscription_id VARCHAR(120),
  notes TEXT,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions (plan_id);
-- Drives the hourly expiry / reminder sweeps.
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end)
  WHERE status IN ('active', 'trialing', 'past_due', 'paused');
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_at_period_end
  ON subscriptions (current_period_end)
  WHERE cancel_at_period_end = true;

-- Per-subscription limit overrides (custom deals). A non-expired override
-- always beats the plan entitlement.
CREATE TABLE IF NOT EXISTS subscription_overrides (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions (id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL,
  value JSONB NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_overrides_subscription
  ON subscription_overrides (subscription_id, key);

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON subscriptions;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON subscription_overrides;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON subscription_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
