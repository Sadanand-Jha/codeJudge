-- Billing: payments/invoices, coupons and gateway webhook idempotency.
-- All money columns are integer paise. All timestamps are TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions (id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  gateway VARCHAR(24) NOT NULL DEFAULT 'razorpay',
  gateway_payment_id VARCHAR(120),
  gateway_order_id VARCHAR(120),
  invoice_number VARCHAR(40) UNIQUE,
  paid_at TIMESTAMPTZ,
  refund_amount INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refunded_at TIMESTAMPTZ,
  method VARCHAR(40),
  notes TEXT,
  -- Raw gateway callback payload for auditing/reconciliation. Never stores
  -- card data (gateway tokens only).
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments (subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status, created_at DESC);
-- Idempotency anchors: one local row per gateway order/payment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_order
  ON payments (gateway, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_payment
  ON payments (gateway, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL CHECK (type IN ('percent', 'flat', 'free_days')),
  -- percent: 1-100, flat: paise, free_days: days.
  value INTEGER NOT NULL CHECK (value > 0),
  applies_to_plan_ids INTEGER[],
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  per_user_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code_lower ON coupons (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons (status);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions (id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions (coupon_id, user_id);

-- Webhook idempotency: each gateway event id is stored exactly once, so
-- replaying a webhook never double-activates a subscription.
CREATE TABLE IF NOT EXISTS gateway_events (
  id SERIAL PRIMARY KEY,
  gateway VARCHAR(24) NOT NULL DEFAULT 'razorpay',
  event_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (gateway, event_id)
);

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON payments;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();

DROP TRIGGER IF EXISTS trg_kolkata_touch_updated_at ON coupons;
CREATE TRIGGER trg_kolkata_touch_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
