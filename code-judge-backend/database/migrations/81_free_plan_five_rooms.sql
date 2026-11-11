-- Free accounts can create up to five rooms. Update both the legacy
-- monthly_plans limit used by the entitlement resolver and the plan catalog
-- entitlement shown on the pricing page.
UPDATE monthly_plans
SET rooms_limit = 5,
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'free';

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT id, 'max_rooms', '5'::jsonb
FROM plans
WHERE is_default_free = TRUE
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
