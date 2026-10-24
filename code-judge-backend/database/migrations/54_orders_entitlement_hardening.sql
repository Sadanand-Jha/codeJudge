-- Orders are the entitlement source of truth. Store lifecycle timestamps as
-- absolute UTC instants, link them to users, and add the indexes the resolver
-- and the FIFO credit ledger depend on.

ALTER TABLE orders ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN starts_at TYPE TIMESTAMPTZ USING starts_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN cancelled_at TYPE TIMESTAMPTZ USING cancelled_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN refunded_at TYPE TIMESTAMPTZ USING refunded_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE orders ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_user'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_window'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT chk_orders_window CHECK (
        expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_active_plan
  ON orders (user_id, expires_at DESC)
  WHERE order_type = 'plan' AND status = 'paid' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_orders_credit_fifo
  ON orders (user_id, expires_at ASC, id ASC)
  WHERE status = 'paid' AND is_active = TRUE AND credits_total > 0;

CREATE INDEX IF NOT EXISTS idx_orders_plan ON orders (plan_id);
CREATE INDEX IF NOT EXISTS idx_orders_pack ON orders (pack_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_gateway_order
  ON orders (gateway, gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_gateway_payment
  ON orders (gateway, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_utc();
