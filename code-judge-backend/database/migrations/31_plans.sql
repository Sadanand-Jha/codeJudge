-- Subscription plan catalog: plans, prices and per-plan entitlements.
-- Entitlement keys are defined in the application registry
-- (src/config/entitlementRegistry.ts); the database only stores key/value so
-- adding or renaming a limit never needs a migration.

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_default_free BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMPTZ
);

-- Only one plan may be the default free plan at any time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_default_free
  ON plans ((is_default_free))
  WHERE is_default_free = true;

CREATE INDEX IF NOT EXISTS idx_plans_status ON plans (status);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans (sort_order);

CREATE TABLE IF NOT EXISTS plan_prices (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  billing_period VARCHAR(20) NOT NULL
    CHECK (billing_period IN ('monthly', 'quarterly', 'yearly', 'lifetime', 'custom_days')),
  custom_days INTEGER CHECK (custom_days IS NULL OR custom_days > 0),
  -- Money is always stored as integer paise (never floats).
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  tax_inclusive BOOLEAN NOT NULL DEFAULT true,
  gateway_price_id VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_plan ON plan_prices (plan_id);

-- One active row per (plan, billing period); custom_days NULL folds to 0 so
-- the unique index also covers non-custom periods.
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_prices_period
  ON plan_prices (plan_id, billing_period, COALESCE(custom_days, 0));

CREATE TABLE IF NOT EXISTS plan_entitlements (
  plan_id INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  key VARCHAR(64) NOT NULL,
  -- Numbers (including -1 for unlimited) or booleans; type is enforced by the
  -- application registry, not the database schema.
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, key)
);

-- Keep updated_at fresh. These tables use TIMESTAMPTZ, so the trigger writes
-- an absolute instant (CURRENT_TIMESTAMP). The function is created here (not
-- reusing migration 23/24 helpers, which the hosted database never received in
-- their current form) so this migration is self-sufficient.
CREATE OR REPLACE FUNCTION public.touch_updated_at_utc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON plans;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON plan_prices;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON plan_entitlements;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
