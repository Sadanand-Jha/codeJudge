# Country-wise Subscription Plan — Complete Backend

> **TL;DR (Hinglish):** Admin set karta hai har country ke liye alag price (Elevate plan ke liye) → backend detect karta hai user ka country (IP, mobile, saved currency, signed header) → public catalog me wo price dikhata hai → checkout time par usi price ka Razorpay order banta hai aur order/subscription me country, currency, amount, config version snapshot save hota hai.

This document explains the **country-wise subscription plan** feature: how the platform charges a different monthly price for the paid Elevate plan depending on the visitor's country. It covers every file, controller, service, repository, database table, API contract, country-detection priority, checkout snapshot, admin API, configuration, testing, and troubleshooting.

It is the backend companion to the frontend pricing pages and the `/platform/pricing` console Countries tab.

---

## 1. What is regionalized

- **Only the paid Elevate plan** (slugs `pro` and `elevate`) is regionally priced, and only its **monthly** price is overridden.
- The free plan (slug `free`, `is_default_free = true`) is never overridden.
- Credit packs (`ai_credit_packs.price_inr`) are not regionalized.
- The base catalog in `plans` / `plan_prices` remains the source of truth for whether a plan exists, its features/entitlements, trial days, visibility, and CTA text. Country pricing only replaces the displayed/sold monthly amount and currency for Elevate.

---

## 2. File map

### Backend

| File | What it does | Why it exists |
|---|---|---|
| `database/migrations/78_country_wise_pricing.sql` | Creates `country_pricing_configs`, adds snapshot columns to `orders` and `subscriptions`, indexes, and seed prices. | Versioned, per-country price overlay with historical snapshots so old payments never drift. |
| `src/services/countryPricing.service.ts` | Country detection priority chain, HMAC signed-header verification, Razorpay currency support, card-country mismatch flagging. | Single place that decides which country price applies to a request. |
| `src/repositories/countryPricing.repository.ts` | Current/fallback price lookups, billing-currency lock, user mobile lookup, admin list + revenue, versioned append-only save with `FOR UPDATE` lock. | All SQL for country pricing; keeps queries out of controllers/services. |
| `src/controllers/countryPricing.controller.ts` | Admin list/save handlers; validates currency exponent and decimal places; returns `{ success, message, data }`. | Thin HTTP layer for admin country-pricing routes. |
| `src/middleware/countryPricing.validate.ts` | Zod schema `countryPricingBodySchema` (`currency`, `amountMajor`, `isActive`). | Rejects malformed admin payloads before any DB work. |
| `src/routes/v1/platformSubscriptions.routes.ts` | Mounts `GET /country-pricing`, `PUT /country-pricing/:countryCode`, `PUT /country-pricing/fallback` under `/api/v1/platform/subscriptions`. | Owner-only admin routes for country pricing. |
| `src/services/pricing.service.ts` | Public catalog query; replaces the Elevate monthly price with the resolved country price; returns `countryPricing` block. | Builds the `/api/v1/pricing` response consumed by marketing and creator pages. |
| `src/controllers/pricing.controller.ts` | `getPublicPricingHandler` and `getPricingContentHandler`; sets `Cache-Control: private, no-store`. | Public pricing HTTP handlers. |
| `src/routes/v1/pricing.routes.ts` | Mounts `GET /` and `GET /content` under `/api/v1/pricing` with `optionalAuthenticate`. | Anonymous marketing traffic works; signed-in sessions enable mobile fallback. |
| `src/services/billing.service.ts` | `createPlanOrder` calls `resolveCountryPricing` at purchase time, rejects unsupported currencies (`503 CURRENCY_NOT_ENABLED`), and snapshots country/amount/config/version on the order. | Checkout uses the live country price, not a stale catalog price. |
| `src/repositories/billing.repository.ts` | Writes `pricing_country`, `pricing_amount_minor`, `pricing_config_id`, `pricing_version` on orders/subscriptions. | Persists the country-price snapshot for every purchase. |
| `src/utils/trustedProxy.ts` | `isTrustedPeer`, `connectingIpFromTrustedPeer`; parses `GEO_TRUSTED_PROXY_IPS` (exact IP + CIDR, IPv4/IPv6). | Headers `cf-ipcountry` / `x-vercel-ip-country` are trusted only from the direct TCP peer. |
| `src/config/razorpay.ts` | `isRazorpayConfigured()` feeds `checkoutAvailable`. | Gates whether checkout is offered for a resolved currency. |
| `src/services/subscriptionAudit.service.ts` | `writeSubscriptionAudit` records plan purchase/subscription changes. | Audit trail tied to country-priced subscriptions. |
| `src/__tests__/countryPricing.test.ts` | Resolution unit tests (detection, HMAC, currency exponents). | Regression coverage for country detection logic. |

### Frontend

| File | What it does |
|---|---|
| `src/services/pricingServer.ts` | SSR catalog fetch; signs the incoming geo header with `PRICING_GEO_SHARED_SECRET` before calling the backend. |
| `src/services/pricing.ts`, `src/types/pricing.ts` | Catalog fetch client, types, empty fallback. |
| `src/hooks/usePricingCatalog.ts` | Client catalog hook for creator billing pages. |
| `src/components/pricing/LandingPlanCard.tsx` | Marketing plan card; disables CTA when `checkoutAvailable` is false. |
| `src/components/creator/billing/MonthlyPlansPage.tsx` | Creator plans list; filters out `price > 0` unless it is the current plan. |
| `src/components/platform/pricing/CountryPricingAdmin.tsx` | Countries tab: per-country currency/amount/active toggle + revenue columns. |
| `src/components/platform/pricing/PricingAdmin.tsx` | Pricing console shell (Plans, Countries, Credit packs, Coupons, Page content tabs). |
| `src/services/platform.ts` | Platform API client and plan/country-pricing types. |

---

## 3. Environment variables

Add these to `code-judge-backend/.env`:

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_SUPPORTED_CURRENCIES=INR
GEO_TRUSTED_PROXY_IPS=
PRICING_GEO_SHARED_SECRET=
PRICING_DEFAULT_COUNTRY=IN
NODE_ENV=development
```

| Variable | Required | Why |
|---|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Yes, for checkout | Required for `checkoutAvailable` to be `true` and for Razorpay order creation. |
| `RAZORPAY_SUPPORTED_CURRENCIES` | No | Comma-separated allow-list (default `INR`). A resolved currency not in this list blocks checkout with `503 CURRENCY_NOT_ENABLED`. |
| `GEO_TRUSTED_PROXY_IPS` | No | Comma-separated exact IPs or CIDR ranges (IPv4/IPv6) of direct peers allowed to supply country headers. Empty disables header trust. |
| `PRICING_GEO_SHARED_SECRET` | No | HMAC secret (at least 32 chars) shared with the frontend SSR proxy for signed geo headers. |
| `PRICING_DEFAULT_COUNTRY` | No | ISO country used when no signal is detected (useful for local development). |
| `NODE_ENV`, `VERCEL_ENV`, `VERCEL` | No | Control whether the dev `?country=` override is allowed. Must not be production on local/staging. |

Frontend (server-only, never `NEXT_PUBLIC_`):

| Variable | Purpose |
|---|---|
| `PRICING_FRONTEND_TRUSTED_GEO_HEADER` | `cf-ipcountry` or `x-vercel-ip-country`; set only when a proxy overwrites that header. |
| `PRICING_GEO_SHARED_SECRET` | Must match the backend value. |
| `BACKEND_URL`, `PRICING_API_URL` | Optional backend origins for SSR catalog fetches. |

---

## 4. Database model

### `country_pricing_configs`

Created by `database/migrations/78_country_wise_pricing.sql`.

| Column | Meaning |
|---|---|
| `id` | BIGSERIAL primary key. |
| `country_code` | ISO 3166-1 alpha-2; `NULL` for the fallback row. |
| `currency` | ISO 4217 currency code (e.g. `INR`, `USD`, `IDR`). |
| `amount_major` | Human-readable price (e.g. `199.00`). |
| `amount_minor` | Smallest-unit price (e.g. `19900` paise); authoritative for billing. |
| `minor_unit_exponent` | Decimal exponent for the currency (`2` for INR/USD, `0` for IDR). |
| `version` | Monotonically increasing version per country (and per fallback). |
| `is_fallback` | `true` for the row used when no country row matches. |
| `is_active` | `false` disables this price and forces resolution to the fallback. |
| `is_current` | `true` for exactly one row per country (and one fallback row). |
| `updated_by` | Platform user id that saved the version. |
| `created_at` | Timestamp of insert. |

Constraints and indexes:

- `CHECK (amount_major >= 0)` and `CHECK (amount_minor >= 0)`.
- `CHECK ((is_fallback AND country_code IS NULL) OR (NOT is_fallback AND country_code ~ '^[A-Z]{2}$'))`.
- `uq_country_pricing_version (country_code, version) WHERE country_code IS NOT NULL`.
- `uq_country_pricing_current_country (country_code) WHERE is_current AND country_code IS NOT NULL`.
- `uq_country_pricing_current_fallback (is_fallback) WHERE is_current AND is_fallback`.

Every admin save is **append-only versioning**: the previous current row is set `is_current = false`, and a new row with `version + 1` becomes current (`createPricingVersion` in `src/repositories/countryPricing.repository.ts`). The transaction takes a `FOR UPDATE` lock on the current row. Old versions are retained because orders reference them.

### Order and subscription snapshots

Migration 78 adds snapshot columns so historical payments never drift when a country price changes:

- `orders.pricing_country`, `orders.pricing_amount_minor`, `orders.pricing_config_id`, `orders.pricing_version`.
- `subscriptions.billing_country`, `subscriptions.billing_currency`, `subscriptions.billing_price_minor`, `subscriptions.pricing_config_id`, `subscriptions.pricing_version`.

### Seed data

Migration 78 seeds an active/current version 1 for many countries (only when no current row already exists, so it is safe to re-run):

| Country | Currency | Amount |
|---|---|---|
| IN | INR | 199.00 |
| US | USD | 4.99 |
| GB | GBP | 3.99 |
| CA | CAD | 6.99 |
| AU | AUD | 7.99 |
| DE / FR | EUR | 4.99 |
| AE | AED | 14.99 |
| SG | SGD | 6.99 |
| BR | BRL | 14.90 |
| MX / ZA | MXN / ZAR | 49.00 |
| PH | PHP | 149.00 |
| ID | IDR | 49000 (exponent 0) |
| PK | PKR | 499.00 |
| BD | BDT | 399.00 |
| NP | NPR | 299.00 |
| fallback (`NULL`) | USD | 4.99 |

Countries without a row use the fallback price automatically.

---

## 5. How a request's country is chosen

`resolveCountryPricing(userId, request)` in `src/services/countryPricing.service.ts` decides the price in this priority order. The first step that yields a country or a locked currency wins:

0. **Saved-currency lock.** A signed-in user who already has a subscription with `billing_currency` keeps that currency and country, regardless of IP, mobile, or dev overrides. The lookup (`findBillingCurrencyLock`) reads the latest subscription in status `active`, `past_due`, `paused`, `canceled`, or `expired`. It then uses the current active price for that currency and country (`findCurrentPriceByCurrency`), reported as `source: "locked"`. If that currency has no active row (for example, it was disabled in `/platform`), a warning is logged and detection continues. Checkout never fails because of this.
1. **Dev override `?country=XX`.** Accepted only outside production (`isProductionRuntime()` checks `NODE_ENV`, `VERCEL_ENV`, and `VERCEL`). Reported as `source: "dev_override"`. In production the parameter is ignored.
2. **Trusted proxy headers.** `cf-ipcountry` (Cloudflare) or `x-vercel-ip-country` (Vercel) are only accepted when the direct TCP peer (`req.socket.remoteAddress`, never `X-Forwarded-For`) is in `GEO_TRUSTED_PROXY_IPS`. Entries can be exact IPs or CIDR ranges, IPv4 or IPv6 (`src/utils/trustedProxy.ts`). Malformed entries are skipped with a warning, and an empty list disables header trust. Pseudo codes `XX`, `T1`, and `A1` are rejected.
3. **Signed frontend SSR header.** The Next.js server can forward `x-pricing-country`, `x-pricing-timestamp`, and `x-pricing-signature`. The signature is `HMAC-SHA256(\`${country}:${timestamp}\`)` using `PRICING_GEO_SHARED_SECRET` (at least 32 chars); the timestamp must be within 300 seconds. Signature comparison is timing-safe.
4. **Mobile calling code** for authenticated users (only when no IP or dev override country was found). `users.mobile` must be E.164; a fixed calling-code table maps it to a country (`+91` -> IN, `+44` -> GB, and so on). North American `+1` is intentionally not mapped because it cannot identify a single country. Reported as `source: "mobile"`.
5. **`PRICING_DEFAULT_COUNTRY`** when nothing was detected (useful for local development). Reported as `source: "default"`.
6. **Fallback row** (`is_fallback = true`) when there is no detected country or no current/active row for it. Reported as `source: "fallback"`.

Because the saved-currency lock (step 0) runs in `resolveCountryPricing`, it applies to both the public catalog and checkout.

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
  source: "locked" | "dev_override" | "ip" | "mobile" | "default" | "fallback";
}
```

`checkoutAvailable` is `true` only when:

- Razorpay API keys are configured (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`), and
- the resolved currency is in `RAZORPAY_SUPPORTED_CURRENCIES` (default: `INR`).

If no fallback row exists, the public catalog returns HTTP 503.

Country rows are looked up only when they are both **current and active** (`findCurrentPrice`). A disabled country therefore resolves to the fallback row, while its current record and version history are kept.

---

## 6. API endpoints

Base path: `/api/v1`

### Public pricing catalog (mounted before the auth guard)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/pricing` | Optional (`optionalAuthenticate`) | Returns `{ plans, creditPacks, countryPricing, updatedAt }`. Anonymous marketing traffic works; a valid session enables the mobile-country fallback. Sent with `Cache-Control: private, no-store`. |
| `GET` | `/pricing/content` | Optional | Returns page copy (`{ content }`) served separately for `/pricing`. |

### Admin country pricing (owner-only, under `/api/v1/platform/subscriptions`)

All routes require a platform owner session; they are mounted under `/api/v1/platform` ahead of regular-user auth and gated by `requireOwner`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/country-pricing` | Current prices for every country plus fallback, and revenue grouped by country/currency (paid orders, revenue, active subscriptions). |
| `PUT` | `/country-pricing/:countryCode` | Save a new version for one country. |
| `PUT` | `/country-pricing/fallback` | Save a new fallback version (must remain active). |

Request body (`countryPricingBodySchema` in `src/middleware/countryPricing.validate.ts`):

```json
{ "currency": "INR", "amountMajor": 199, "isActive": true }
```

Behavior:

- The currency must be a valid ISO code understood by `Intl`; the minor-unit exponent is derived from the currency and `amountMajor` is converted to `amountMinor` with exact decimal-place validation.
- The fallback price cannot be deactivated (`isActive` must be `true`), so the catalog always has a price to serve.
- A country can be deactivated; resolution then uses the fallback until it is re-enabled by saving a new active version.
- Each save creates a new version and returns `{ success: true, message: "Country price saved.", data: { price } }`.

### Checkout (uses country pricing)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/billing/plans/orders` | Required | Create/reuse a plan checkout. Re-resolves country pricing, rejects unsupported currency (`503 CURRENCY_NOT_ENABLED`), snapshots `pricing_country`, `pricing_amount_minor`, `pricing_config_id`, `pricing_version` on the order. |

---

## 7. Public catalog — Elevate price override

`GET /api/v1/pricing` is handled by `getPublicPricingHandler` in `src/controllers/pricing.controller.ts`, which calls `pricingService.getPublicCatalog(userId, request)` in `src/services/pricing.service.ts`.

Plan inclusion rules:

- `plans.status = 'active'`.
- `plans.is_public = true` OR `plans.is_default_free = true`.
- The plan must have an active monthly price in `plan_prices`; the query uses an inner `JOIN LATERAL`, so a plan without one is omitted from the catalog entirely.

Price override rules for `pro` / `elevate`:

- The active monthly price is replaced with the resolved country price: `amount = countryPricing.amount` and `currency = countryPricing.currency`.
- `originalPrice` and `discountBadge` are cleared.
- `prices` is reduced to the single monthly entry so the UI cannot offer other billing periods at the base currency.
- Every other plan, and every plan's base prices, remain unchanged.
- `countryPricing` is always returned, even when the request resolves to the fallback row.

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

---

## 8. Checkout and billing

`createPlanOrder` in `src/services/billing.service.ts`:

1. Loads the purchasable plan from the base catalog (`findPurchasablePlan`).
2. Rejects anything other than a monthly period (`UNSUPPORTED_BILLING_PERIOD`).
3. Calls `resolveCountryPricing(userId, request)` again at purchase time.
4. Rejects checkout with HTTP 503 `CURRENCY_NOT_ENABLED` when `isRazorpayCurrencySupported(resolved.currency)` is false.
5. Uses `countryPricing.amountMinor` as both list and selling price, and `countryPricing.currency` as the order currency.
6. Snapshots `pricing_country`, `pricing_amount_minor`, `pricing_config_id`, and `pricing_version` on the order; the subscription stores `billing_country`, `billing_currency`, `billing_price_minor`, `pricing_config_id`, and `pricing_version`.
7. A reusable pending order (`findReusablePendingOrder`) is only reused when `reusableOrderIsCurrent` confirms its price/currency/country snapshot still matches the live resolution; otherwise it is discarded (`discardStalePendingOrder`) and recreated.

After a payment is captured, `cardCountryMismatch` compares the card's issuing country (Razorpay payment entity) with `orders.pricing_country`. For an INR order, an international card is also flagged. Mismatches are **logged and flagged only**; they never reject a payment. Payments without a card (UPI, netbanking, wallet) are not checked.

Existing subscriptions keep their historical snapshot; repricing only affects new orders. Renaming or re-benefiting plans does not change country prices.

---

## 9. Function reference

### 9.1 Country detection service — `src/services/countryPricing.service.ts`

| Function | What it does |
|---|---|
| `resolveCountryPricing(userId, request?)` | Runs the full detection priority chain; returns `CountryPricingSelection`. Throws if no fallback row exists. |
| `countryFromDevOverride(request, env?)` | Returns `?country=` value only outside production; null in production. |
| `countryFromTrustedProxyHeaders(input)` | Reads `cf-ipcountry` / `x-vercel-ip-country` only when the direct peer is trusted. |
| `countryFromSignedFrontend(request)` | Verifies `x-pricing-country`/`x-pricing-timestamp`/`x-pricing-signature` HMAC (300s window, timing-safe). |
| `verifySignedFrontendCountry(input)` | Low-level HMAC verification; requires secret ≥ 32 chars, 10-digit timestamp. |
| `countryFromMobile(mobile)` | Maps E.164 calling code to country via a fixed table; skips `+1`. |
| `choosePricingCountry({ ipCountry, mobileCountry })` | IP first, then mobile, then fallback. |
| `isRazorpayCurrencySupported(currency)` | True only when Razorpay is configured and the currency is in `RAZORPAY_SUPPORTED_CURRENCIES`. |
| `cardCountryMismatch(pricingCountry, card?)` | Flags card-issuer-country mismatch or international card on INR orders; never blocks payment. |
| `isProductionRuntime(env?)` | True when `NODE_ENV=production` / `VERCEL_ENV=production` / `VERCEL=1`. |
| `getCurrencyMinorUnitExponent(currency)` | Derives exponent from `Intl.NumberFormat` (2 for INR/USD, 0 for IDR). |
| `getRazorpaySupportedCurrencies()` | Sorted list of supported currency codes. |

### 9.2 Repository — `src/repositories/countryPricing.repository.ts`

| Function | What it does |
|---|---|
| `findCurrentPrice(countryCode)` | Current + active row for a country; null if disabled/missing. |
| `findFallbackPrice()` | Current + active fallback row. |
| `findBillingCurrencyLock(userId)` | Latest paid subscription's `billing_currency`/`billing_country` (status filter). |
| `findCurrentPriceByCurrency(currency, preferredCountry)` | Current active price for a currency, preferring the subscriber's country. |
| `findUserMobile(userId)` | Reads `users.mobile` for mobile-based detection. |
| `listAdminPricing()` | All current prices + revenue grouped by country/currency (orders + subscriptions). |
| `createPricingVersion(input)` | Append-only versioned save inside a `FOR UPDATE` transaction; deactivates previous current row. |

### 9.3 Controller — `src/controllers/countryPricing.controller.ts`

| Function | Endpoint |
|---|---|
| `listCountryPricingHandler` | `GET /country-pricing` |
| `updateCountryPricingHandler` | `PUT /country-pricing/:countryCode` |
| `updateFallbackPricingHandler` | `PUT /country-pricing/fallback` |

The shared `savePricingVersion` validates the currency exponent, decimal places, and safe-integer range before calling `createPricingVersion`. Fallback saves require `isActive === true`.

### 9.4 Validation — `src/middleware/countryPricing.validate.ts`

| Schema | Used by |
|---|---|
| `countryPricingBodySchema` | Both admin save endpoints. Fields: `currency` (ISO 3 alpha), `amountMajor` (0 to 10,000,000), `isActive` (boolean). |

### 9.5 Public pricing — `src/services/pricing.service.ts`

| Function | What it does |
|---|---|
| `getPublicCatalog(userId, request?)` | Builds plans/credit packs/countryPricing; overrides Elevate monthly price with resolved country price. |
| `getPageContent()` | Returns pricing page copy key/value pairs. |

### 9.6 Public pricing controller — `src/controllers/pricing.controller.ts`

| Function | Endpoint |
|---|---|
| `getPublicPricingHandler` | `GET /pricing` (sets `Cache-Control: private, no-store`) |
| `getPricingContentHandler` | `GET /pricing/content` |

### 9.7 Trusted proxy — `src/utils/trustedProxy.ts`

| Function | What it does |
|---|---|
| `isTrustedPeer(peerAddress)` | True when the direct TCP peer is in `GEO_TRUSTED_PROXY_IPS` (exact or CIDR). |
| `connectingIpFromTrustedPeer(peerAddress, headerValue)` | Returns `CF-Connecting-IP` only when peer is trusted and header is a valid IP. |

---

## 10. Frontend rendering

Two entry points resolve the same catalog:

- **Server-rendered marketing pages** (`src/services/pricingServer.ts`):
  - Calls the backend with `cache: "no-store"`.
  - Forwards the `session_token` cookie, if present.
  - If `PRICING_FRONTEND_TRUSTED_GEO_HEADER` is `cf-ipcountry` or `x-vercel-ip-country`, reads that incoming header and signs it with `PRICING_GEO_SHARED_SECRET` before calling the backend. Without both values, no geo header is forwarded and the backend falls back to IP/mobile/default.
  - Tries `PRICING_API_URL`, then `BACKEND_URL`, then `https://api.quizsupport.com`.
  - Returns an empty catalog on failure rather than failing the page.
- **Client-side creator pages** (`src/hooks/usePricingCatalog.ts` via the browser API client): the backend resolves the country from the request IP and/or the authenticated user's mobile. The session cookie is sent because the API is on the same registrable domain.

Rendering behavior:

- `LandingPlanCard` shows the resolved currency and country name, and disables the CTA with a "not available in your region" message when `checkoutAvailable` is false (except for the free plan).
- Amounts are formatted with the currency's own minor-unit exponent (`Intl`), so zero-decimal currencies such as IDR render correctly.
- The creator Plans page (`MonthlyPlansPage.tsx`) renders every catalog plan except those filtered by `price > 0 || plan.slug === activePlanId`. In other words, a paid plan whose resolved price is `0` is hidden unless it is the user's current plan.

---

## 11. Idempotency, locking, and race safety

| Mechanism | Where | Why |
|---|---|---|
| Append-only versioning (`is_current` flip + new row) | `createPricingVersion` | Old order/subscription snapshots reference specific versions; they never drift. |
| `FOR UPDATE` lock on current row | `createPricingVersion` transaction | Concurrent admin saves for the same country serialize cleanly. |
| Unique indexes `uq_country_pricing_current_country` / `uq_country_pricing_current_fallback` | Migration 78 | Exactly one current row per country and one current fallback row. |
| Reusable pending order + `reusableOrderIsCurrent` | `billing.service.ts` `createPlanOrder` | A stale checkout (price/country changed) is discarded and recreated, never charged at an old amount. |
| Snapshot on order + subscription | `billing.service.ts` / migration 78 | Historical payments keep the exact country/amount/config/version they were sold under. |

---

## 12. Testing

Country detection, HMAC verification, and currency exponents:

```bash
cd code-judge-backend
npx tsx src/__tests__/countryPricing.test.ts
```

Billing and country-price snapshot coverage:

```bash
npm run test:billing
```

Start the API locally:

```bash
cd code-judge-backend
DISABLE_BACKGROUND_WORKERS=1 PORT=8099 npx tsx src/server.ts
```

Verify the effective price:

```bash
curl -s http://localhost:8099/api/v1/pricing | jq '.data.countryPricing'
```

From a trusted proxy, pass the geo headers; locally you can set `PRICING_DEFAULT_COUNTRY=IN` or call the backend from an IP in `GEO_TRUSTED_PROXY_IPS`. To verify a specific account, call the endpoint with that user's `session_token` and inspect `countryPricing.source` and `plans[] | select(.slug == "pro")`.

Manual admin save:

```bash
curl -i -X PUT http://localhost:8099/api/v1/platform/subscriptions/country-pricing/US \
  -H 'Content-Type: application/json' \
  -H 'Cookie: platform_session=...' \
  -d '{"currency":"USD","amountMajor":5.99,"isActive":true}'
```

---

## 13. Production checklist

- [ ] Apply migration `78_country_wise_pricing.sql` (review `npm run migration:dry` first).
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_SUPPORTED_CURRENCIES`.
- [ ] Set `GEO_TRUSTED_PROXY_IPS` to your ingress/Cloudflare IPs so country headers are trusted and rate limiting isn't bucketed behind one edge IP.
- [ ] Set `PRICING_GEO_SHARED_SECRET` (≥ 32 chars) and match it on the frontend SSR proxy.
- [ ] Set `PRICING_DEFAULT_COUNTRY` for local/staging fallbacks.
- [ ] Verify `GET /api/v1/pricing` returns `countryPricing` with `checkoutAvailable: true` for INR.
- [ ] Verify admin `PUT /country-pricing/:countryCode` appends a new version and makes it current.
- [ ] Verify fallback cannot be deactivated (`isActive` must be `true`).
- [ ] Run a test-mode plan purchase end to end and confirm `orders.pricing_*` / `subscriptions.billing_*` snapshots are written.
- [ ] Confirm Redis is running (auth and entitlement cache).
- [ ] Confirm the backend has HTTPS in production.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Elevate missing on `/creator/billing/plans` but visible in admin | Resolved country amount is `0`, and the creator page filters out `price > 0` unless it is the current plan | Save a non-zero amount for that country (or deactivate it so the fallback applies). Never use `0` as an "off" switch. |
| Elevate missing everywhere on the public catalog | Plan has no active monthly `plan_prices` row; the catalog query inner-joins it | Publish an active monthly price for the plan. |
| Price shows USD 4.99 instead of the local price | No active/current row for the detected country, so the fallback row is used; check `countryPricing.isFallback` and `source` | Create/activate the country row, or check country detection. |
| Country detection always reports `fallback` behind a proxy | The ingress peer IP is not in `GEO_TRUSTED_PROXY_IPS`, so `cf-ipcountry` / `x-vercel-ip-country` are ignored | Add the exact proxy IPs/CIDR, or configure the signed SSR header. |
| Signed SSR header is ignored | `PRICING_FRONTEND_TRUSTED_GEO_HEADER` unset, secret shorter than 32 chars, clock skew over 300 seconds, or secrets do not match | Align both secrets and header configuration. |
| Subscriber still sees an old currency after a country price change | Saved-currency lock (`billing_currency` on the latest subscription) takes priority over detection, by design | Expected. Existing subscribers keep their currency; the lock is not released by a price change. |
| `?country=` has no effect | Running with `NODE_ENV=production` or `VERCEL` set, or the user has a saved-currency lock (which wins) | Expected in production. Test with a non-production runtime and a user without a lock. |
| Rate limits look like one visitor behind Cloudflare | `CF-Connecting-IP` not trusted because the peer is not in `GEO_TRUSTED_PROXY_IPS` | Add the edge/ingress IPs or CIDR range. |
| `CTA disabled / checkoutAvailable: false` | Razorpay keys missing or resolved currency not in `RAZORPAY_SUPPORTED_CURRENCIES` | Add the keys and enable the currency in the Razorpay account and allow-list. |
| Checkout returns `503 CURRENCY_NOT_ENABLED` | Same as above, re-checked at order time | Same as above. |
| Admin save fails with a decimal-place error | `amountMajor` has more decimals than the currency supports (e.g. IDR with exponent 0) | Round to the allowed precision. |
| Fallback save fails | The fallback row was submitted with `isActive: false` | The fallback must remain active. |
| Catalog returns 503 | No active fallback row exists, or the database query failed | Restore an active fallback price and check backend logs. |
| Admin plan card shows a different price than the creator page | The plan editor shows the base `plan_prices` monthly amount; only the Countries tab and public catalog apply the country override | Compare on the Countries tab or via `/api/v1/pricing`. |
| Payment marked with card-country mismatch in logs | Card issuer country differs from `pricing_country`, or an international card on an INR order | Informational only. No action needed unless it is a pattern of abuse. |

---

## 15. Known limitations / next steps

1. **Country pricing applies only to Elevate monthly.** Other plans keep their base INR price; credit packs are not regionalized.
2. **Razorpay Subscriptions API is not used.** Monthly plans are one-time Razorpay Orders; renewal is manual (user buys again). Auto-renew mandates/SI are future work.
3. **No invoice/GST generation.** Invoice fields are not populated for country-priced orders.
4. **No admin refund UI.** Refunds are processed by Razorpay webhooks.
5. **Frontend still reads `NEXT_PUBLIC_RAZORPAY_KEY_ID`.** The API also returns `keyId`, so the frontend can be simplified later.
6. **No automated gateway integration tests.** Unit tests cover pure logic/signatures; Razorpay test-mode checkout should be exercised manually.
