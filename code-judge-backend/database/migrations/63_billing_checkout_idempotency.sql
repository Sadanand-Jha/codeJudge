-- One open checkout per user/item/coupon. This is the database backstop for
-- double-clicks: the service also reuses the pending order, but the unique
-- index prevents two concurrent requests from creating duplicate orders.

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_open_checkout
  ON orders (
    user_id,
    order_type,
    COALESCE(catalog_plan_id, 0),
    COALESCE(pack_id, 0),
    LOWER(COALESCE(coupon_code, ''))
  )
  WHERE status = 'pending';
