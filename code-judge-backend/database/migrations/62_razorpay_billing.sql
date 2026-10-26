-- Razorpay checkout support for monthly plans and AI credit packs.
--
-- Public plans live in `plans`, while the legacy `orders` ledger expects a
-- `monthly_plans` row. `catalog_plan_id` links an order to the plan displayed
-- on the pricing page without breaking the legacy FK, and `subscription_id`
-- records the entitlement created after a verified payment.
--
-- Money columns in `orders` (amount_inr / mrp_inr / discount_inr) are stored
-- in paise, matching Razorpay and `plan_prices.amount`.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS catalog_plan_id INTEGER REFERENCES plans (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS catalog_price_id INTEGER REFERENCES plan_prices (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_id INTEGER REFERENCES subscriptions (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS gateway_signature VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway_payload JSONB,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount INTEGER NOT NULL DEFAULT 0;

-- A plan order is valid when it points at either the public plan catalog or
-- the legacy monthly_plans catalog. Credit-pack orders must only reference a
-- pack.
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
  );

-- Track which checkout consumed a coupon so abandoned attempts can release it.
ALTER TABLE coupon_redemptions
  ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_order
  ON coupon_redemptions (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_catalog_plan
  ON orders (catalog_plan_id);

CREATE INDEX IF NOT EXISTS idx_orders_subscription
  ON orders (subscription_id);

CREATE INDEX IF NOT EXISTS idx_orders_pending_created
  ON orders (created_at)
  WHERE status = 'pending';
