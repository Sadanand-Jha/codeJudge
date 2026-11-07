import { pool } from "../config/database.ts";

export interface CountryPriceRow {
  id: number;
  countryCode: string | null;
  currency: string;
  amountMajor: number;
  amountMinor: number;
  minorUnitExponent: number;
  version: number;
  isFallback: boolean;
  isActive: boolean;
}

function mapCountryPrice(row: Record<string, unknown>): CountryPriceRow {
  return {
    id: Number(row.id),
    countryCode: row.country_code == null ? null : String(row.country_code).trim(),
    currency: String(row.currency).trim(),
    amountMajor: Number(row.amount_major),
    amountMinor: Number(row.amount_minor),
    minorUnitExponent: Number(row.minor_unit_exponent),
    version: Number(row.version),
    isFallback: row.is_fallback === true,
    isActive: row.is_active === true,
  };
}

export async function findCurrentPrice(countryCode: string): Promise<CountryPriceRow | null> {
  const result = await pool.query(
    `SELECT id, country_code, currency, amount_major, amount_minor,
            minor_unit_exponent, version, is_fallback, is_active
     FROM country_pricing_configs
     WHERE country_code = $1 AND is_current = TRUE AND is_active = TRUE
     LIMIT 1`,
    [countryCode]
  );
  return result.rows[0] ? mapCountryPrice(result.rows[0]) : null;
}

export async function findFallbackPrice(): Promise<CountryPriceRow | null> {
  const result = await pool.query(
    `SELECT id, country_code, currency, amount_major, amount_minor,
            minor_unit_exponent, version, is_fallback, is_active
     FROM country_pricing_configs
     WHERE is_fallback = TRUE AND is_current = TRUE AND is_active = TRUE
     LIMIT 1`
  );
  return result.rows[0] ? mapCountryPrice(result.rows[0]) : null;
}

export async function findVerifiedBillingPrice(userId: string): Promise<
  | (CountryPriceRow & { source: "subscription" | "payment" })
  | null
> {
  const result = await pool.query(
    `SELECT source, country_code, currency, amount_minor, config_id, version,
            minor_unit_exponent
     FROM (
       SELECT 'subscription'::text AS source,
              s.billing_country AS country_code,
              s.billing_currency AS currency,
              s.billing_price_minor AS amount_minor,
              s.pricing_config_id AS config_id,
              COALESCE(s.pricing_version, 0) AS version,
              c.minor_unit_exponent,
              0 AS priority,
              s.updated_at AS happened_at
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id AND p.is_default_free = FALSE
       LEFT JOIN country_pricing_configs c ON c.id = s.pricing_config_id
       WHERE s.user_id = $1
         AND s.billing_country IS NOT NULL
         AND s.billing_currency IS NOT NULL
         AND s.billing_price_minor IS NOT NULL
         AND s.status IN ('active', 'past_due')
         AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)

       UNION ALL

       SELECT 'payment'::text AS source,
              COALESCE(o.pricing_country, 'IN') AS country_code,
              o.currency,
              COALESCE(o.pricing_amount_minor, o.amount_inr::bigint) AS amount_minor,
              o.pricing_config_id AS config_id,
              COALESCE(o.pricing_version, 0) AS version,
              c.minor_unit_exponent,
              1 AS priority,
              COALESCE(o.paid_at, o.created_at) AS happened_at
       FROM orders o
       JOIN plans p ON p.id = o.catalog_plan_id AND p.is_default_free = FALSE
       LEFT JOIN country_pricing_configs c ON c.id = o.pricing_config_id
       WHERE o.user_id = $1
         AND o.order_type = 'plan'
         AND o.status = 'paid'
         AND o.currency IS NOT NULL
     ) billing
     ORDER BY priority ASC, happened_at DESC
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.config_id == null ? 0 : Number(row.config_id),
    countryCode: String(row.country_code).trim(),
    currency: String(row.currency).trim(),
    amountMajor: 0,
    amountMinor: Number(row.amount_minor),
    minorUnitExponent:
      row.minor_unit_exponent == null ? 2 : Number(row.minor_unit_exponent),
    version: Number(row.version),
    isFallback: false,
    isActive: true,
    source: row.source as "subscription" | "payment",
  };
}

export async function findUserMobile(userId: string): Promise<string | null> {
  const result = await pool.query(`SELECT mobile FROM users WHERE id = $1 LIMIT 1`, [userId]);
  return result.rows[0]?.mobile == null ? null : String(result.rows[0].mobile);
}

export async function listAdminPricing(): Promise<{
  prices: Array<CountryPriceRow & { isCurrent: boolean }>;
  revenue: Array<{
    countryCode: string | null;
    currency: string;
    orders: number;
    revenueMinor: number;
    subscriptions: number;
  }>;
}> {
  const [pricesResult, ordersResult, subscriptionsResult] = await Promise.all([
    pool.query(
      `SELECT id, country_code, currency, amount_major, amount_minor,
              minor_unit_exponent, version, is_fallback, is_active, is_current
       FROM country_pricing_configs
       WHERE is_current = TRUE
       ORDER BY is_fallback ASC, country_code ASC`
    ),
    pool.query(
      `SELECT pricing_country AS country_code, currency,
              COUNT(*)::int AS orders,
              COALESCE(SUM(amount_inr), 0)::bigint AS revenue_minor
       FROM orders
       WHERE order_type = 'plan' AND status = 'paid'
       GROUP BY pricing_country, currency`
    ),
    pool.query(
      `SELECT billing_country AS country_code, billing_currency AS currency,
              COUNT(*)::int AS subscriptions
       FROM subscriptions
       WHERE status IN ('active', 'past_due')
         AND (current_period_end IS NULL OR current_period_end > CURRENT_TIMESTAMP)
       GROUP BY billing_country, billing_currency`
    ),
  ]);
  const totals = new Map<string, {
    countryCode: string | null;
    currency: string;
    orders: number;
    revenueMinor: number;
    subscriptions: number;
  }>();
  const keyOf = (country: string | null, currency: string) => `${country ?? "ZZ"}:${currency}`;
  for (const row of ordersResult.rows) {
    const countryCode = row.country_code == null ? null : String(row.country_code).trim();
    const currency = String(row.currency).trim();
    totals.set(keyOf(countryCode, currency), {
      countryCode,
      currency,
      orders: Number(row.orders),
      revenueMinor: Number(row.revenue_minor),
      subscriptions: 0,
    });
  }
  for (const row of subscriptionsResult.rows) {
    const countryCode = row.country_code == null ? null : String(row.country_code).trim();
    const currency = String(row.currency).trim();
    const key = keyOf(countryCode, currency);
    const total = totals.get(key) ?? {
      countryCode,
      currency,
      orders: 0,
      revenueMinor: 0,
      subscriptions: 0,
    };
    total.subscriptions = Number(row.subscriptions);
    totals.set(key, total);
  }
  return {
    prices: pricesResult.rows.map((row) => ({
      ...mapCountryPrice(row),
      isCurrent: row.is_current === true,
    })),
    revenue: [...totals.values()].sort((a, b) =>
      `${a.countryCode ?? "ZZ"}:${a.currency}`.localeCompare(
        `${b.countryCode ?? "ZZ"}:${b.currency}`
      )
    ),
  };
}

export async function createPricingVersion(input: {
  countryCode: string | null;
  currency: string;
  amountMajor: number;
  amountMinor: number;
  minorUnitExponent: number;
  isFallback: boolean;
  isActive: boolean;
  actorId: number | null;
}): Promise<CountryPriceRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT id, version
       FROM country_pricing_configs
       WHERE is_current = TRUE
         AND ((is_fallback = TRUE AND $1::boolean = TRUE)
           OR (is_fallback = FALSE AND country_code = $2))
       FOR UPDATE`,
      [input.isFallback, input.countryCode]
    );
    const version = Number(current.rows[0]?.version ?? 0) + 1;
    if (current.rows[0]) {
      await client.query(
        `UPDATE country_pricing_configs SET is_current = FALSE WHERE id = $1`,
        [current.rows[0].id]
      );
    }
    const result = await client.query(
      `INSERT INTO country_pricing_configs
         (country_code, currency, amount_major, amount_minor,
          minor_unit_exponent, version, is_fallback, is_active,
          is_current, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING id, country_code, currency, amount_major, amount_minor,
                 minor_unit_exponent, version, is_fallback, is_active`,
      [
        input.countryCode,
        input.currency,
        input.amountMajor,
        input.amountMinor,
        input.minorUnitExponent,
        version,
        input.isFallback,
        input.isActive,
        input.actorId,
      ]
    );
    await client.query("COMMIT");
    return mapCountryPrice(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
