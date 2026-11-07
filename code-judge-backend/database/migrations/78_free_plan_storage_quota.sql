-- Set the default free plan's included storage to 200 MB.
INSERT INTO plan_entitlements (plan_id, key, value)
SELECT id, 'storage_mb', '200'::jsonb
FROM plans
WHERE is_default_free = TRUE
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
