# Country-wise plan pricing

This document describes how the platform shows and charges a different monthly
price for the paid plan (Elevate) depending on the visitor's country. It covers
the database model, country detection, the public catalog, admin editing,
checkout snapshots, frontend rendering, configuration, and operational
troubleshooting.

## At a glance

```text
Admin (/platform/pricing -> Countries tab)
    |
    |  PUT /api/v1/platform/subscriptions/country-pricing/:countryCode
    v
country_pricing_configs  (versioned overlay: country -> currency + amount)
    ^
    |  current + active row, else fallback row
    |
GET /api/v1/pricing  (public catalog)
    |
    |  detect country (trusted proxy IP -> signed SSR header -> mobile -> default)
    |  replace the monthly price of plans with slug "pro" / "elevate"
    v
Marketing pages (SSR)              Creator billing (client)
pricingServer.ts                   usePricingCatalog -> GET /v1/pricing
    |                                   |
    +------------- LandingPlanCard / MonthlyPlansPage

Checkout (POST /api/v1/billing/...)
    |  re-resolve country, verify Razorpay currency support,
    |  snapshot country/amount/config/version on the order and subscription
    v
Razorpay
```

## 1. What is regionalized

- **Only the paid Elevate plan** (slugs `pro` and `elevate`) is regionally
  priced, and only its **monthly** price is overridden.
- The free plan (slug `free`, `is_default_free = true`) is never overridden.
- Credit packs (`ai_credit_packs.price_inr`) are not regionalized.
- The base catalog in `plans` / `plan_prices` remains the source of truth for
  whether a plan exists, its features/entitlements, trial days, visibility, and
  CTA text. Country pricing only replaces the displayed/sold monthly amount and
  currency for Elevate.

## 2. Data model

### `country_pricing_configs`

Created by `database/migrations/78_country_wise_pricing.sql`.

| Column | Meaning |
| --- | --- |
| `country_code` | ISO 3166-1 alpha-2 code; `NULL` for the fallback row |
| `currency` | ISO 4217 currency code (for example `INR`, `USD`, `IDR`) |
| `amount_major` | Human-readable price (for example `199.00`) |
| `amount_minor` | Smallest-unit price (for example `19900` paise); authoritative for billing |
| `minor_unit_exponent` | Decimal exponent for the currency (`2` for INR/USD, `0` for IDR) |
| `version` | Monotonically increasing version per country (and per fallback) |
| `is_fallback` | `true` for the row used when no country row matches |
| `is_active` | `false` disables this price and forces resolution to the fallback |
| `is_current` | `true` for exactly one row per country (and one fallback row) |
| `updated_by` | Platform user id that saved the version |

Constraints and indexes:

- `CHECK (amount_major >= 0)` and `CHECK (amount_minor >= 0)`.
- A country row must have a two-letter country code; the fallback row must have
  `country_code IS NULL`.
- `uq_country_pricing_version (country_code, version)`.
- `uq_country_pricing_current_country (country_code) WHERE is_current AND country_code IS NOT NULL`.
- `uq_country_pricing_current_fallback (is_fallback) WHERE is_current AND is_fallback`.

Every admin save is **append-only versioning**: the previous current row is set
`is_current = false`, and a new row with `version + 1` becomes current
(`createPricingVersion` in
`src/repositories/countryPricing.repository.ts`). The transaction takes a
`FOR UPDATE` lock on the current row. Old versions are retained because orders
reference them.

### Order and subscription snapshots

Migration 78 adds snapshot columns so historical payments never drift when a
country price changes:

- `orders.pricing_country`, `pricing_amount_minor`, `pricing_config_id`,
  `pricing_version`.
- `subscriptions.billing_country`, `billing_currency`, `billing_price_minor`,
  `pricing_config_id`, `pricing_version`.

### Seed data

Migration 78 seeds an active/current version 1 for many countries, for example:

| Country | Currency | Amount |
| --- | --- | --- |
| IN | INR | 199.00 |
| US | USD | 4.99 |
| GB | GBP | 3.99 |
| DE / FR | EUR | 4.99 |
| AE | AED | 14.99 |
| ID | IDR | 49000 (exponent 0) |
| NP | NPR | 299.00 |
| fallback (`NULL`) | USD | 4.99 |

Rows are inserted only when no current row already exists, so the migration is
safe to run on databases that already contain admin-edited prices.

## 3. How a request's country is chosen

`resolveCountryPricing` in `src/services/countryPricing.service.ts` detects the
country in this priority order:

1. **Trusted proxy headers.** `cf-ipcountry` (Cloudflare) or
   `x-vercel-ip-country` (Vercel) are only accepted when the direct peer address
   is listed in `GEO_TRUSTED_PROXY_IPS`. This prevents clients from spoofing the
   header. Pseudo codes `XX`, `T1`, and `A1` are rejected.
2. **Signed frontend SSR header.** The Next.js server can forward
   `x-pricing-country`, `x-pricing-timestamp`, and `x-pricing-signature`. The
   signature is `HMAC-SHA256(`${country}:${timestamp}`)` using
   `PRICING_GEO_SHARED_SECRET`; the timestamp must be within 300 seconds.
   Signature comparison is timing-safe.
3. **Mobile calling code** for authenticated users (only when no IP country was
   found). `users.mobile` must be E.164; a fixed calling-code table maps it to a
   country (`+91` -> IN, `+44` -> GB, and so on). North American `+1` is
   intentionally not mapped because it cannot identify a single country.
4. **`PRICING_DEFAULT_COUNTRY`** when nothing was detected (useful for local
   development). It is reported with `source: "default"`.
5. **Fallback row** (`is_fallback = true`) when there is no detected country or
   no current/active row for it.

The resolved selection is:

```ts
{
  countryCode: string | null;
  countryName: string;       // display name, "Other countries" for null
  currency: string;
  amount: number;            // major units
  amountMinor: number;
  minorUnitExponent: number;
  version: number;
  configId: number;
  isFallback: boolean;
  checkoutAvailable: boolean;
  source: "ip" | "mobile" | "default" | "fallback";
}
```

`checkoutAvailable` is `true` only when:

- Razorpay API keys are configured (`RAZORPAY_KEY_ID` and
  `RAZORPAY_KEY_SECRET`), and
- the resolved currency is in `RAZORPAY_SUPPORTED_CURRENCIES` (default: `INR`).

If no fallback row exists, the public catalog returns HTTP 503.

Country rows are looked up only when they are both **current and active**
(`findCurrentPrice`). A disabled country therefore resolves to the fallback row,
while its current record and version history are kept.

## 4. Public catalog

`GET /api/v1/pricing`

- Mounted before the regular-user auth guard (`src/routes/v1/index.ts`), with
  `optionalAuthenticate`. Anonymous marketing traffic works; a valid session
  enables the mobile-country fallback.
- Response: `{ success: true, data: { plans, creditPacks, countryPricing, updatedAt } }`.
- Sent with `Cache-Control: private, no-store` because the payload depends on
  the caller's country and session.

Plan inclusion rules (`pricingService.getPublicCatalog`):

- `plans.status = 'active'`.
- `plans.is_public = true` OR `plans.is_default_free = true`.
- The plan must have an **active monthly price** in `plan_prices`; the query
  uses an inner `JOIN LATERAL`, so a plan without one is omitted from the
  catalog entirely.

Price override rules for `pro` / `elevate`:

- The active monthly price is replaced with the resolved country price:
  `amount = countryPricing.amount` and `currency = countryPricing.currency`.
- `originalPrice` and `discountBadge` are cleared.
- `prices` is reduced to the single monthly entry so the UI cannot offer other
  billing periods at the base currency.
- Every other plan, and every plan's base prices, remain unchanged.
- `countryPricing` is always returned, even when the request resolves to the
  fallback row.

Example (abridged):

```json
{
  "success": true,
  "data": {
    "plans": [
      { "slug": "free", "price": 0, "currency": "INR" },
      { "slug": "pro", "price": 199, "currency": "INR", "prices": [{ "billingPeriod": "monthly", "amount": 199, "currency": "INR" }] }
    ],
    "creditPacks": [],
    "countryPricing": {
      "countryCode": "IN",
      "countryName": "India",
      "currency": "INR",
      "amount": 199,
      "amountMinor": 19900,
      "minorUnitExponent": 2,
      "version": 1,
      "isFallback": false,
      "checkoutAvailable": true,
      "source": "ip"
    },
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Page copy for `/pricing` is served separately by `GET /api/v1/pricing/content`.

## 5. Admin API and UI

All routes require a platform owner session; they are mounted under
`/api/v1/platform` (ahead of regular-user auth) and gated by `requireOwner`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/platform/subscriptions/country-pricing` | Current prices for every country plus fallback, and revenue grouped by country/currency |
| `PUT` | `/api/v1/platform/subscriptions/country-pricing/:countryCode` | Save a new version for one country |
| `PUT` | `/api/v1/platform/subscriptions/country-pricing/fallback` | Save a new fallback version |

Request body (`countryPricingBodySchema`):

```json
{ "currency": "INR", "amountMajor": 199, "isActive": true }
```

Behavior:

- The currency must be a valid ISO code understood by `Intl`; the minor-unit
  exponent is derived from the currency and `amountMajor` is converted to
  `amountMinor` with exact decimal-place validation.
- The fallback price cannot be deactivated (`isActive` must be `true`), so the
  catalog always has a price to serve.
- A country can be deactivated; resolution then uses the fallback until it is
  re-enabled by saving a new active version.
- Each save creates a new version and returns
  `{ success: true, message: "Country price saved.", data: { price } }`.

UI: Platform console -> **Pricing** -> **Countries** tab
(`/platform/pricing`, `CountryPricingAdmin.tsx`):

- **Country-wise Elevate prices**: per-country currency, amount, Active toggle,
  and revenue columns (paid orders, revenue, active subscriptions).
- **Fallback pricing**: the price used for countries without an active row.
- The plan editor (`Plans` tab) edits the base catalog price; it does **not**
  show the country override. Always check the Countries tab for the effective
  Elevate price.

## 6. Checkout and billing

`createPlanOrder` in `src/services/billing.service.ts`:

1. Loads the purchasable plan from the base catalog.
2. Rejects anything other than a monthly period.
3. Calls `resolveCountryPricing(userId, request)` again at purchase time.
4. Rejects checkout with HTTP 503 `CURRENCY_NOT_ENABLED` when
   `isRazorpayCurrencySupported(resolved.currency)` is false.
5. Uses `countryPricing.amountMinor` as both list and selling price, and
   `countryPricing.currency` as the order currency.
6. Snapshots `pricing_country`, `pricing_amount_minor`, `pricing_config_id`,
   and `pricing_version` on the order; the subscription stores
   `billing_country`, `billing_currency`, `billing_price_minor`,
   `pricing_config_id`, and `pricing_version`.
7. A reusable pending order is only reused when its price/currency/country
   snapshot still matches the current resolution; otherwise it is discarded and
   recreated.

Existing subscriptions keep their historical snapshot; repricing only affects
new orders. Renaming or re-benefiting plans does not change country prices.

## 7. Frontend rendering

Two entry points resolve the same catalog:

- **Server-rendered marketing pages** (`src/services/pricingServer.ts`):
  - Calls the backend with `cache: "no-store"`.
  - Forwards the `session_token` cookie, if present.
  - If `PRICING_FRONTEND_TRUSTED_GEO_HEADER` is `cf-ipcountry` or
    `x-vercel-ip-country`, reads that incoming header and signs it with
    `PRICING_GEO_SHARED_SECRET` before calling the backend. Without both values,
    no geo header is forwarded and the backend falls back to IP/mobile/default.
  - Tries `PRICING_API_URL`, then `BACKEND_URL`, then
    `https://api.quizsupport.com`.
  - Returns an empty catalog on failure rather than failing the page.
- **Client-side creator pages** (`src/hooks/usePricingCatalog.ts` via the
  browser API client): the backend resolves the country from the request IP
  and/or the authenticated user's mobile. The session cookie is sent because
  the API is on the same registrable domain (`.quizsupport.com`) even when the
  origins differ.

Rendering behavior:

- `LandingPlanCard` shows the resolved currency and country name, and disables
  the CTA with a "not available in your region" style message when
  `checkoutAvailable` is false (except for the free plan).
- Amounts are formatted with the currency's own minor-unit exponent (`Intl`),
  so zero-decimal currencies such as IDR render correctly.
- The creator Plans page (`MonthlyPlansPage.tsx`) renders every catalog plan
  except those filtered by `price > 0 || plan.slug === activePlanId`. In other
  words, a paid plan whose resolved price is `0` is hidden unless it is the
  user's current plan.

## 8. Configuration

Backend:

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Required for `checkoutAvailable` to be `true` and for checkout |
| `RAZORPAY_SUPPORTED_CURRENCIES` | Comma-separated allow-list of currencies enabled on the Razorpay account; default `INR` |
| `GEO_TRUSTED_PROXY_IPS` | Comma-separated exact peer IPs allowed to supply country headers |
| `PRICING_GEO_SHARED_SECRET` | HMAC secret (at least 32 chars) shared with the frontend SSR proxy |
| `PRICING_DEFAULT_COUNTRY` | Optional ISO country used when no signal is available (for example `IN` locally) |

Frontend (server-only, never `NEXT_PUBLIC_`):

| Variable | Purpose |
| --- | --- |
| `PRICING_FRONTEND_TRUSTED_GEO_HEADER` | `cf-ipcountry` or `x-vercel-ip-country`; set only when a proxy overwrites that header |
| `PRICING_GEO_SHARED_SECRET` | Must match the backend value |
| `BACKEND_URL`, `PRICING_API_URL` | Optional backend origins for SSR catalog fetches |

## 9. Operational runbook

### Change a country price

1. Open `/platform/pricing` -> **Countries**.
2. Edit the amount/currency and keep **Active** checked.
3. Save. This appends a new version and makes it current immediately.
4. Verify with the public API using that country signal (see below), or ask a
   user in that country to reload `/pricing` and `/creator/billing/plans`.

### Add a country

Use the country row if it already exists in the table; otherwise insert through
the admin (all ISO countries are listed). Countries without a row use the
fallback price automatically.

### Disable a country price

Uncheck **Active** and save. The country falls back to the fallback row; it is
not offered the country amount. Do **not** set the amount to `0` to disable it
(see pitfalls below).

### Change the fallback

Edit **Fallback pricing**; it must remain active. This changes the price for
every country without an active row and for requests where no country could be
detected.

### Verify the effective price

```bash
curl -s https://api.quizsupport.com/api/v1/pricing | jq '.data.countryPricing'
```

From a trusted proxy, pass the geo headers; locally you can set
`PRICING_DEFAULT_COUNTRY=IN` or call the backend from an IP in
`GEO_TRUSTED_PROXY_IPS`. To verify a specific account, call the endpoint with
that user's `session_token` and inspect `countryPricing.source` and
`plans[] | select(.slug == "pro")`.

Useful SQL:

```sql
SELECT country_code, currency, amount_major, amount_minor, version,
       is_fallback, is_active, is_current, updated_by, created_at
FROM country_pricing_configs
ORDER BY is_fallback DESC, country_code, version DESC;

SELECT pricing_country, currency, COUNT(*), SUM(pricing_amount_minor)
FROM orders
WHERE order_type = 'plan' AND status = 'paid'
GROUP BY pricing_country, currency;
```

## 10. Known pitfalls and troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Elevate missing on `/creator/billing/plans` but visible in admin | Resolved country amount is `0`, and the creator page filters out plans where `price > 0` unless it is the current plan | Save a non-zero amount for that country (or deactivate it so the fallback applies). Never use `0` as an "off" switch |
| Elevate missing everywhere on the public catalog | Plan has no active monthly `plan_prices` row; the catalog query inner-joins it | Publish an active monthly price for the plan |
| Price shows USD 4.99 instead of the local price | No active/current row for the detected country, so the fallback row is used; check `countryPricing.isFallback` and `source` | Create/activate the country row, or check country detection |
| Country detection always reports `fallback` behind a proxy | The ingress peer IP is not in `GEO_TRUSTED_PROXY_IPS`, so `cf-ipcountry` / `x-vercel-ip-country` are ignored | Add the exact proxy IPs, or configure the signed SSR header |
| Signed SSR header is ignored | `PRICING_FRONTEND_TRUSTED_GEO_HEADER` unset, secret shorter than 32 chars, clock skew over 300 seconds, or secrets do not match | Align both secrets and header configuration |
| CTA disabled / `checkoutAvailable: false` | Razorpay keys missing or resolved currency not in `RAZORPAY_SUPPORTED_CURRENCIES` | Add the keys and enable the currency in the Razorpay account and allow-list |
| Checkout returns `503 CURRENCY_NOT_ENABLED` | Same as above, re-checked at order time | Same as above |
| Admin plan card shows a different price than the creator page | The plan editor shows the base `plan_prices` monthly amount; only the Countries tab and public catalog apply the country override | Compare on the Countries tab or via `/api/v1/pricing` |
| Admin save fails with a decimal-place error | `amountMajor` has more decimals than the currency supports (for example IDR with exponent 0) | Round to the allowed precision |
| Fallback save fails | The fallback row was submitted with `isActive: false` | The fallback must remain active |
| Catalog returns 503 | No active fallback row exists, or the database query failed | Restore an active fallback price and check backend logs |

Additional note: `optionalAuthenticate` returns 401 for an invalid or expired
`session_token` on `/api/v1/pricing`; the SSR helper and client hook treat that
as an empty catalog. If pricing disappears only for signed-in users, inspect
the session cookie before suspecting country data.

## 11. Tests

Country detection, HMAC verification, and currency exponents:

```bash
npx tsx src/__tests__/countryPricing.test.ts
```

Billing and country-price snapshot coverage:

```bash
npm run test:billing
```

## 12. File map

Backend:

- `database/migrations/78_country_wise_pricing.sql` - schema, snapshot columns,
  indexes, seed prices.
- `src/services/countryPricing.service.ts` - country detection, signature
  verification, fallback resolution, currency support.
- `src/repositories/countryPricing.repository.ts` - current/fallback lookups,
  versioned saves, admin list and revenue.
- `src/controllers/countryPricing.controller.ts` - admin list/save handlers and
  amount validation.
- `src/middleware/countryPricing.validate.ts` - request body schema.
- `src/routes/v1/platformSubscriptions.routes.ts` - admin country-pricing
  routes.
- `src/services/pricing.service.ts` - public catalog query and Elevate
  override.
- `src/controllers/pricing.controller.ts` - public catalog handler and cache
  headers.
- `src/routes/v1/pricing.routes.ts` - public pricing routes.
- `src/services/billing.service.ts` - checkout resolution and order
  snapshots.
- `src/__tests__/countryPricing.test.ts` - resolution unit tests.

Frontend:

- `src/services/pricingServer.ts` - SSR catalog fetch and signed geo header.
- `src/services/pricing.ts`, `src/types/pricing.ts` - catalog fetch, types,
  empty fallback.
- `src/hooks/usePricingCatalog.ts` - client catalog hook.
- `src/components/pricing/LandingPlanCard.tsx` - marketing plan card and
  checkout gating.
- `src/components/creator/billing/MonthlyPlansPage.tsx` - creator plans list
  and the `price > 0` visibility filter.
- `src/components/platform/pricing/CountryPricingAdmin.tsx` - Countries tab.
- `src/components/platform/pricing/PricingAdmin.tsx` - pricing console shell.
- `src/services/platform.ts` - admin country-pricing API client.
