-- Entitlement fields added to the monthly plan catalog. Every user-facing
-- limit/feature is read from these columns through the entitlement resolver.

ALTER TABLE monthly_plans
  ADD COLUMN IF NOT EXISTS rooms_limit INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS remove_watermark BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier_rank INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE monthly_plans
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ai_credit_packs
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_monthly_plans_non_negative'
  ) THEN
    ALTER TABLE monthly_plans
      ADD CONSTRAINT chk_monthly_plans_non_negative CHECK (
        price_inr >= 0
        AND mrp_inr >= 0
        AND trial_days >= 0
        AND quizzes_per_month >= 0
        AND members_per_room >= 0
        AND ai_credits_per_month >= 0
        AND emails_per_day >= 0
        AND rooms_limit >= 0
        AND validity_days > 0
      );
  END IF;
END $$;

UPDATE monthly_plans
SET rooms_limit = CASE code
      WHEN 'free' THEN 1
      WHEN 'basic' THEN 5
      WHEN 'pro' THEN 5
      ELSE rooms_limit
    END,
    remove_watermark = CASE code
      WHEN 'pro' THEN TRUE
      ELSE FALSE
    END,
    tier_rank = CASE code
      WHEN 'free' THEN 0
      WHEN 'basic' THEN 1
      WHEN 'pro' THEN 2
      ELSE tier_rank
    END,
    validity_days = 30
WHERE code IN ('free', 'basic', 'pro');

CREATE OR REPLACE FUNCTION public.touch_updated_at_utc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_monthly_plans_updated_at ON monthly_plans;
CREATE TRIGGER trg_monthly_plans_updated_at
  BEFORE UPDATE ON monthly_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
