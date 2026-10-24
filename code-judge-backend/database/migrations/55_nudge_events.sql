-- Conversion telemetry for upgrade nudges. One row per shown/clicked/dismissed
-- event, so funnel queries never depend on client-side analytics.

CREATE TABLE IF NOT EXISTS nudge_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  nudge_key VARCHAR(80) NOT NULL,
  action VARCHAR(16) NOT NULL
    CHECK (action IN ('shown', 'clicked', 'dismissed', 'converted')),
  plan_code VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nudge_events_user_created
  ON nudge_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nudge_events_key_action
  ON nudge_events (nudge_key, action, created_at DESC);
