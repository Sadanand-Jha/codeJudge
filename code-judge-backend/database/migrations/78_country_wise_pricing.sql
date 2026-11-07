-- Versioned country-specific prices for the existing Elevate subscription.
-- Previous orders and subscriptions remain intact and receive historical
-- snapshots where their existing payment/catalog data makes that possible.

CREATE TABLE IF NOT EXISTS country_pricing_configs (
  id BIGSERIAL PRIMARY KEY,
  country_code CHAR(2),
  currency CHAR(3) NOT NULL,
  amount_major NUMERIC(14, 3) NOT NULL CHECK (amount_major >= 0),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  minor_unit_exponent SMALLINT NOT NULL CHECK (minor_unit_exponent BETWEEN 0 AND 3),
  version INTEGER NOT NULL CHECK (version > 0),
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (is_fallback = TRUE AND country_code IS NULL) OR
    (is_fallback = FALSE AND country_code ~ '^[A-Z]{2}$')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_country_pricing_version
  ON country_pricing_configs (country_code, version)
  WHERE country_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_country_pricing_current_country
  ON country_pricing_configs (country_code)
  WHERE is_current = TRUE AND country_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_country_pricing_current_fallback
  ON country_pricing_configs (is_fallback)
  WHERE is_current = TRUE AND is_fallback = TRUE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pricing_country CHAR(2),
  ADD COLUMN IF NOT EXISTS pricing_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS pricing_config_id BIGINT
    REFERENCES country_pricing_configs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pricing_version INTEGER;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_country CHAR(2),
  ADD COLUMN IF NOT EXISTS billing_currency CHAR(3),
  ADD COLUMN IF NOT EXISTS billing_price_minor BIGINT,
  ADD COLUMN IF NOT EXISTS pricing_config_id BIGINT
    REFERENCES country_pricing_configs(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pricing_version INTEGER;

UPDATE orders
SET pricing_country = 'IN',
    pricing_amount_minor = amount_inr,
    pricing_version = 0
WHERE order_type = 'plan'
  AND currency = 'INR'
  AND pricing_country IS NULL;

UPDATE orders
SET pricing_amount_minor = amount_inr,
    pricing_version = 0
WHERE order_type = 'plan'
  AND pricing_amount_minor IS NULL;

UPDATE subscriptions s
SET billing_country = COALESCE(
      s.billing_country,
      (
        SELECT o.pricing_country
        FROM orders o
        WHERE o.user_id = s.user_id
          AND o.order_type = 'plan'
          AND o.status = 'paid'
          AND o.catalog_plan_id = s.plan_id
        ORDER BY o.paid_at DESC NULLS LAST, o.id DESC
        LIMIT 1
      ),
      'IN'
    ),
    billing_currency = COALESCE(
      s.billing_currency,
      (
        SELECT o.currency
        FROM orders o
        WHERE o.user_id = s.user_id
          AND o.order_type = 'plan'
          AND o.status = 'paid'
          AND o.catalog_plan_id = s.plan_id
        ORDER BY o.paid_at DESC NULLS LAST, o.id DESC
        LIMIT 1
      ),
      (
        SELECT pp.currency
        FROM plan_prices pp
        WHERE pp.id = s.price_id
      ),
      'INR'
    ),
    billing_price_minor = COALESCE(
      s.billing_price_minor,
      (
        SELECT o.pricing_amount_minor
        FROM orders o
        WHERE o.user_id = s.user_id
          AND o.order_type = 'plan'
          AND o.status = 'paid'
          AND o.catalog_plan_id = s.plan_id
        ORDER BY o.paid_at DESC NULLS LAST, o.id DESC
        LIMIT 1
      ),
      (
        SELECT pp.amount
        FROM plan_prices pp
        WHERE pp.id = s.price_id
      ),
      0
    ),
    pricing_version = COALESCE(s.pricing_version, 0)
WHERE s.billing_country IS NULL
   OR s.billing_currency IS NULL
   OR s.billing_price_minor IS NULL
   OR s.pricing_version IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_pricing_country_currency
  ON orders (pricing_country, currency, status)
  WHERE order_type = 'plan';
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_country_currency
  ON subscriptions (billing_country, billing_currency, status);

INSERT INTO country_pricing_configs
  (country_code, currency, amount_major, amount_minor, minor_unit_exponent,
   version, is_fallback, is_active, is_current)
SELECT v.country_code, v.currency, v.amount_major, v.amount_minor,
       v.minor_unit_exponent, 1, FALSE, TRUE, TRUE
FROM (VALUES
  ('IN', 'INR', 199.00, 19900, 2),
  ('US', 'USD', 4.99, 499, 2),
  ('GB', 'GBP', 3.99, 399, 2),
  ('CA', 'CAD', 6.99, 699, 2),
  ('AU', 'AUD', 7.99, 799, 2),
  ('DE', 'EUR', 4.99, 499, 2),
  ('FR', 'EUR', 4.99, 499, 2),
  ('AE', 'AED', 14.99, 1499, 2),
  ('SG', 'SGD', 6.99, 699, 2),
  ('BR', 'BRL', 14.90, 1490, 2),
  ('MX', 'MXN', 49.00, 4900, 2),
  ('ZA', 'ZAR', 49.00, 4900, 2),
  ('PH', 'PHP', 149.00, 14900, 2),
  ('ID', 'IDR', 49000.00, 49000, 0),
  ('PK', 'PKR', 499.00, 49900, 2),
  ('BD', 'BDT', 399.00, 39900, 2),
  ('NP', 'NPR', 299.00, 29900, 2)
) AS v(country_code, currency, amount_major, amount_minor, minor_unit_exponent)
WHERE NOT EXISTS (
  SELECT 1
  FROM country_pricing_configs c
  WHERE c.country_code = v.country_code
    AND c.is_current = TRUE
);

INSERT INTO country_pricing_configs
  (country_code, currency, amount_major, amount_minor, minor_unit_exponent,
   version, is_fallback, is_active, is_current)
SELECT NULL, 'USD', 4.99, 499, 2, 1, TRUE, TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM country_pricing_configs WHERE is_fallback = TRUE AND is_current = TRUE
);
