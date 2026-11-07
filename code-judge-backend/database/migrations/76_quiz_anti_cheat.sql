-- Quiz anti-cheat is now an opt-in security option instead of always-on.
-- Only paid plans can enable it; the entitlement is seeded below for every
-- non-free plan. Existing quizzes default to disabled so free plans cannot
-- use it.

ALTER TABLE quiz
  ADD COLUMN IF NOT EXISTS anti_cheat_enabled BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO plan_entitlements (plan_id, key, value)
SELECT p.id, 'anti_cheat', 'true'::jsonb
FROM plans p
WHERE p.is_default_free = FALSE
  AND p.slug <> 'free'
ON CONFLICT (plan_id, key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;
