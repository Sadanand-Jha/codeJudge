-- Checkout upsells: a server-owned plan + AI-credit-pack bundle catalog and
-- anonymous-safe conversion telemetry. Bundle orders keep the existing
-- one-grant-per-order credit ledger by creating paid child grant orders inside
-- the same transaction as the parent payment.

CREATE TABLE IF NOT EXISTS plan_bundles (
  id              BIGSERIAL PRIMARY KEY,
  plan_id         INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  pack_id         INTEGER NOT NULL REFERENCES ai_credit_packs (id) ON DELETE RESTRICT,
  name            VARCHAR(160) NOT NULL,
  description     TEXT,
  badge           VARCHAR(80) NOT NULL DEFAULT 'Best value',
  amount_paise    INTEGER NOT NULL CHECK (amount_paise > 0),
  mrp_paise       INTEGER NOT NULL CHECK (mrp_paise >= amount_paise),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_bundles_plan_pack UNIQUE (plan_id, pack_id)
);

DROP TRIGGER IF EXISTS trg_plan_bundles_updated_at ON plan_bundles;
CREATE TRIGGER trg_plan_bundles_updated_at
  BEFORE UPDATE ON plan_bundles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS parent_order_id BIGINT
    REFERENCES orders (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS bundle_id BIGINT
    REFERENCES plan_bundles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bundle_plan_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_pack_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_pack_validity_days INTEGER;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('plan', 'credit_pack', 'bundle'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_item;
ALTER TABLE orders
  ADD CONSTRAINT chk_order_item CHECK (
    (
      order_type = 'plan'
      AND pack_id IS NULL
      AND (plan_id IS NOT NULL OR catalog_plan_id IS NOT NULL)
    )
    OR (
      order_type = 'credit_pack'
      AND pack_id IS NOT NULL
      AND plan_id IS NULL
      AND catalog_plan_id IS NULL
    )
    OR (
      order_type = 'bundle'
      AND catalog_plan_id IS NOT NULL
      AND catalog_price_id IS NOT NULL
      AND pack_id IS NOT NULL
      AND parent_order_id IS NULL
      AND credits_total = 0
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_bundle_grant
  ON orders (parent_order_id, order_type)
  WHERE parent_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_parent
  ON orders (parent_order_id)
  WHERE parent_order_id IS NOT NULL;

-- One active bundle per plan/pack. The price is a real catalog value, not a
-- client-side discount. Seed a 10%-off bundle for every public paid plan using
-- the lowest-priced active pack, rounded down to whole rupees.
WITH bundle_candidates AS (
  SELECT
    p.id AS plan_id,
    pack.id AS pack_id,
    p.name || ' + ' || pack.credits || ' AI credits' AS name,
    pp.amount + (pack.price_inr * 100) AS regular_paise,
    ((pp.amount + (pack.price_inr * 100)) * 9 / 10 / 100) * 100 AS bundle_paise,
    p.sort_order
  FROM plans p
  JOIN LATERAL (
    SELECT amount
    FROM plan_prices
    WHERE plan_id = p.id
      AND billing_period = 'monthly'
      AND is_active = TRUE
    ORDER BY id DESC
    LIMIT 1
  ) pp ON TRUE
  JOIN LATERAL (
    SELECT id, price_inr, credits
    FROM ai_credit_packs
    WHERE is_active = TRUE
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
  ) pack ON TRUE
  WHERE p.status = 'active'
    AND p.is_public = TRUE
    AND p.is_default_free = FALSE
    AND pp.amount > 0
)
INSERT INTO plan_bundles
  (plan_id, pack_id, name, description, badge, amount_paise, mrp_paise,
   is_active, sort_order)
SELECT
  plan_id,
  pack_id,
  name,
  'Everything in your monthly plan plus extra AI credits, in one payment.',
  'Best value',
  GREATEST(100, bundle_paise),
  GREATEST(regular_paise, GREATEST(100, bundle_paise)),
  TRUE,
  sort_order
FROM bundle_candidates
ON CONFLICT (plan_id, pack_id) DO NOTHING;

-- Checkout upsell telemetry shares the existing nudge funnel table. Anonymous
-- impressions are allowed; event_name carries the exact required event while
-- action keeps the existing shown/clicked/dismissed/converted aggregation.
ALTER TABLE nudge_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE nudge_events ADD COLUMN IF NOT EXISTS event_name VARCHAR(60);
ALTER TABLE nudge_events ADD COLUMN IF NOT EXISTS session_id VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_nudge_events_event_name
  ON nudge_events (event_name, created_at DESC)
  WHERE event_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nudge_events_session
  ON nudge_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;
