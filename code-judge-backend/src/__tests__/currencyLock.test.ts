// Currency-lock tests against a REAL Postgres server.
//
// Run:
//   TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/some_throwaway_db \
//     npx tsx src/__tests__/currencyLock.test.ts
//
// WARNING: drops and recreates the tables below. Use a throwaway database only.
// The schema is a minimal subset of database/migrations (32, 78) with the same
// column names and types, so the lock query runs against real Postgres semantics.
import assert from "node:assert/strict";
import type { Request } from "express";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("Set TEST_DATABASE_URL to a throwaway Postgres database.");
  process.exit(1);
}

// Must be set before the pool module is imported: it reads these at load time.
process.env.DATABASE_POOL_URL = testUrl;
process.env.DATABASE_URL = testUrl;
process.env.DATABASE_SSL = "false";
process.env.NODE_ENV = "test";
process.env.GEO_TRUSTED_PROXY_IPS = "10.0.0.5";
delete process.env.PRICING_DEFAULT_COUNTRY;

const { pool } = await import("../config/database.ts");
const repo = await import("../repositories/countryPricing.repository.ts");
const { resolveCountryPricing } = await import("../services/countryPricing.service.ts");

async function setupSchema(): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS subscriptions, country_pricing_configs, users CASCADE;
    CREATE TABLE users (id SERIAL PRIMARY KEY);
    CREATE TABLE subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL DEFAULT 'active'
        CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
      billing_country CHAR(2),
      billing_currency CHAR(3)
    );
    CREATE TABLE country_pricing_configs (
      id BIGSERIAL PRIMARY KEY,
      country_code CHAR(2),
      currency CHAR(3) NOT NULL,
      amount_major NUMERIC(14, 3) NOT NULL,
      amount_minor BIGINT NOT NULL,
      minor_unit_exponent SMALLINT NOT NULL,
      version INTEGER NOT NULL,
      is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_current BOOLEAN NOT NULL DEFAULT TRUE
    );
    INSERT INTO country_pricing_configs
      (country_code, currency, amount_major, amount_minor, minor_unit_exponent, version, is_fallback)
    VALUES
      ('IN', 'INR', 199.000, 19900, 2, 1, FALSE),
      (NULL, 'USD', 7.990, 799, 2, 1, TRUE);
    INSERT INTO users (id) VALUES (1), (2), (3);
  `);
}

// Simulates a request from a US visitor, arriving through the trusted Cloudflare peer.
const usVisitor = {
  query: {},
  headers: { "cf-ipcountry": "US" },
  socket: { remoteAddress: "10.0.0.5" },
} as unknown as Request;

try {
  await setupSchema();

  // Case 1: user with no subscription. No lock; the US IP gets the USD fallback.
  assert.equal(await repo.findBillingCurrencyLock("1"), null);
  const noSub = await resolveCountryPricing("1", usVisitor);
  assert.equal(noSub.currency, "USD");
  assert.equal(noSub.source, "ip");
  assert.equal(noSub.amount, 7.99);

  // Case 2: user with only an abandoned/unpaid subscription. Neither row may lock.
  //   - trialing row with NULL billing_currency (never paid)
  //   - trialing row WITH billing_currency: must still be ignored by status
  await pool.query(
    `INSERT INTO subscriptions (user_id, status, billing_country, billing_currency)
     VALUES (2, 'trialing', NULL, NULL), (2, 'trialing', 'IN', 'INR')`
  );
  assert.equal(await repo.findBillingCurrencyLock("2"), null);
  const abandoned = await resolveCountryPricing("2", usVisitor);
  assert.equal(abandoned.currency, "USD");
  assert.equal(abandoned.source, "ip");

  // Case 3: user with a paid INR subscription while the IP says US.
  // The lock wins: INR at the IN price, source "locked".
  await pool.query(
    `INSERT INTO subscriptions (user_id, status, billing_country, billing_currency)
     VALUES (3, 'active', 'IN', 'INR')`
  );
  // A later row with NULL billing_currency (for example, an unpriced free plan) must be skipped.
  await pool.query(
    `INSERT INTO subscriptions (user_id, status, billing_country, billing_currency)
     VALUES (3, 'active', NULL, NULL)`
  );
  assert.deepEqual(await repo.findBillingCurrencyLock("3"), { currency: "INR", country: "IN" });
  const paid = await resolveCountryPricing("3", usVisitor);
  assert.equal(paid.currency, "INR");
  assert.equal(paid.amount, 199);
  assert.equal(paid.countryCode, "IN");
  assert.equal(paid.source, "locked");
  assert.equal(paid.isFallback, false);

  console.log("currencyLock.test.ts: all assertions passed (real Postgres).");
} finally {
  await pool.end();
}
