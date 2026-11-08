-- Response-report emails (manual and automatic quiz-end reports) are a paid
-- feature. Free/default plans fall back to the registry default (false).
INSERT INTO plan_entitlements (plan_id, key, value)
SELECT id, 'email_responses', 'true'::jsonb
FROM plans
WHERE is_default_free = FALSE
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
