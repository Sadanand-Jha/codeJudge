-- Subscription audit log (append-only), platform billing settings, the default
-- free plan and a backfill so every existing user starts on the free plan.

CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id INTEGER,
  actor_role VARCHAR(30) NOT NULL DEFAULT 'system',
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(80),
  before JSONB,
  after JSONB,
  reason TEXT,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_created
  ON subscription_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_entity
  ON subscription_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_actor
  ON subscription_audit_log (actor_id);

-- Platform billing settings (key/value so new settings need no migration).
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by INTEGER REFERENCES users (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (key, value) VALUES
  ('grace_period_days', '3'),
  ('retry_schedule_days', '[1, 3, 5]'),
  ('default_currency', '"INR"'),
  ('tax_percent', '18'),
  ('gstin', 'null'),
  ('invoice_prefix', '"QS"'),
  ('invoice_next_number', '1'),
  ('email_sender', 'null'),
  ('email_reply_to', 'null'),
  ('trial_days_default', '0')
ON CONFLICT (key) DO NOTHING;

-- Default free plan. Entitlement values mirror the limits that were previously
-- hardcoded in the application so nothing changes for existing users.
INSERT INTO plans (name, slug, description, status, is_public, is_default_free, sort_order, trial_days)
VALUES (
  'Free',
  'free',
  'Everything you need to get started with quizzes.',
  'active',
  true,
  true,
  0,
  0
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT p.id, e.key, e.value::jsonb
FROM plans p
CROSS JOIN (VALUES
  ('max_quizzes', '10'),
  ('max_questions_per_quiz', '30'),
  ('max_participants_per_quiz', '-1'),
  ('max_monthly_attempts', '-1'),
  ('pdf_download', 'true'),
  ('answer_key_pdf', 'true'),
  ('custom_pdf_header', 'true'),
  ('remove_branding', 'false'),
  ('ai_features', 'true'),
  ('storage_mb', '-1'),
  ('team_members', '0')
) AS e(key, value)
WHERE p.slug = 'free'
ON CONFLICT (plan_id, key) DO NOTHING;

-- Backfill: every existing user gets an active free subscription so admin
-- listings and the entitlement resolver have a single source of truth.
INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_start, source)
SELECT u.id, p.id, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'migration'
FROM users u
CROSS JOIN (SELECT id FROM plans WHERE is_default_free = true LIMIT 1) AS p
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);
