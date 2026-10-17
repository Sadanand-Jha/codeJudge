-- Price history fix: a plan may keep at most one ACTIVE price per billing
-- period, but any number of deactivated rows (grandfathered prices referenced
-- by existing subscriptions). The original full unique index in
-- 31_plans.sql prevented inserting a replacement price for the same period.
DROP INDEX IF EXISTS uq_plan_prices_period;

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_prices_active_period
  ON plan_prices (plan_id, billing_period, COALESCE(custom_days, 0))
  WHERE is_active = true;
