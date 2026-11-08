# Razorpay Billing Backend — Complete Flow

> **TL;DR (Hinglish):** Frontend order create karta hai → backend DB me `pending` order + Razorpay order banata hai → Razorpay checkout open hota hai → payment ke baad frontend verify API call karta hai (aur webhook backup hota hai) → backend signature/payment verify karke order ko `paid` karta hai, credits grant karta hai, aur plan ke liye subscription activate/extend karta hai.

This document explains the complete Razorpay backend for:

1. **Monthly plans** (`basic`, `pro`, future public plans)
2. **One-time AI credit packs** (`teacher`, `master`)

It covers every file, function, database table, API contract, webhook event, idempotency rule, and production check.

---

## 1. Why this backend exists

The frontend must never decide how much money to charge or how many credits to grant. The backend:

- Reads the **server-owned price** from `plan_prices` / `ai_credit_packs`.
- Creates a Razorpay order with that exact amount in **paise**.
- Verifies the checkout signature using the **Razorpay key secret**.
- Fetches the payment from Razorpay and checks amount, currency, order, and captured status.
- Grants credits and activates subscriptions **exactly once**, even if the client retries or Razorpay sends the same webhook again.
- Keeps a purchase ledger so refunds, support, and future invoices can be reconciled.

---

## 2. File map

| File | What it does | Why it exists |
|---|---|---|
| `database/migrations/62_razorpay_billing.sql` | Adds `catalog_plan_id`, `catalog_price_id`, `subscription_id`, coupon fields, gateway payload/signature, failure/refund fields. Relaxes `chk_order_item`. Adds `coupon_redemptions.order_id`. | The legacy `orders` table only knew `monthly_plans`; new public plans live in `plans`. This links a checkout to the public catalog and to the created subscription. |
| `database/migrations/63_billing_checkout_idempotency.sql` | Unique partial index `uq_orders_open_checkout`. | Prevents two concurrent requests from creating duplicate pending checkouts for the same user/item/coupon. |
| `src/config/razorpay.ts` | Env/config helpers. | Keeps keys and API base in one place and lets the app boot without payment keys. |
| `src/services/billing/razorpay.client.ts` | Razorpay REST client (`createOrder`, `fetchPayment`, `fetchOrderPayments`). | Small HTTP surface; no Razorpay SDK dependency. |
| `src/services/billing/signatures.ts` | HMAC-SHA256 helpers. | Checkout and webhook signatures are the security boundary. |
| `src/services/billing/calculations.ts` | Pure helpers for validity, discounts, order numbers, subscription placement. | Easy to unit test without DB or network. |
| `src/services/billing/errors.ts` | `BillingError` and type guard. | Controllers return consistent `{ success, code, message }` errors. |
| `src/repositories/billing.repository.ts` | All SQL for catalog, orders, coupons, subscriptions, credits, webhook events. | Keeps SQL out of business logic and makes every query reviewable. |
| `src/services/billing.service.ts` | Orchestrates checkout, verification, activation, refunds, webhooks. | The single source of billing business rules. |
| `src/controllers/billing.controller.ts` | HTTP request/response handlers. | Thin layer: parse, call service, map errors. |
| `src/middleware/billing.validate.ts` | Zod schemas. | Rejects malformed payloads before any DB work. |
| `src/routes/v1/billing.routes.ts` | Mounts public webhook/config and authenticated purchase/read routes. | Webhook must stay public; everything else needs auth. |
| `src/routes/v1/index.ts` | Mounts `/billing` **before** the global `authenticate` guard. | Allows the webhook/config routes to remain public while the router itself authenticates user routes. |
| `src/app.ts` | Captures raw JSON bytes for `/api/v1/billing/webhook`. | Razorpay signs the **raw body**, not the re-serialized object. |
| `src/middleware/globalRateLimit.ts` | Adds the billing webhook to rate-limit bypass paths. | Razorpay retries must not be blocked by the global IP limiter. |
| `src/__tests__/billing.test.ts` | Unit tests for calculations and signatures. | Fast regression coverage for money/signature logic. |
| `package.json` | `npm run test:billing`. | One command to run billing unit tests. |

---

## 3. Environment variables

Add these to `code-judge-backend/.env`:

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_API_BASE_URL=https://api.razorpay.com/v1
```

| Variable | Required | Why |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes, for checkout | Public key id used by Razorpay Checkout. Returned as `keyId` in order responses and by `GET /billing/config`. |
| `RAZORPAY_KEY_SECRET` | Yes, for checkout | Server-only secret used for Basic Auth to Razorpay and for checkout signature verification. Never expose it. |
| `RAZORPAY_WEBHOOK_SECRET` | Yes, for webhooks | Used to verify `X-Razorpay-Signature` over the raw webhook body. |
| `RAZORPAY_API_BASE_URL` | No | Defaults to production Razorpay. Useful for sandbox proxies/tests. |

If the key pair is missing:

- `GET /api/v1/billing/config` returns `{ configured: false, keyId: null }`.
- `POST /billing/credits/orders` and `POST /billing/plans/orders` return `503 PAYMENT_GATEWAY_NOT_CONFIGURED`.
- The rest of the app still boots normally.

Frontend note: the current credit-pack checkout reads `NEXT_PUBLIC_RAZORPAY_KEY_ID`. Either set that variable in the frontend or update the frontend to use the `keyId` returned by the order API.

---

## 4. Database model

### 4.1 Tables used by billing

| Table | Role in billing |
|---|---|
| `plans` | Public plan catalog (`free`, `basic`, `pro`). Only active, public, non-free plans can be purchased. |
| `plan_prices` | Monthly price snapshot. Amount is in **paise**. `mrp_amount` is the strike-through price. |
| `plan_entitlements` | Per-plan limits, including `ai_credits_per_month`. |
| `ai_credit_packs` | One-time packs. `price_inr` is in **rupees** and is multiplied by 100 by the backend. |
| `subscriptions` | Active/trialing/canceled plan access. The new entitlement resolver reads this. |
| `monthly_plans` | Legacy plan catalog. Used only to map a public plan slug to a legacy `plan_id` for older code. |
| `orders` | Purchase ledger for **both** plans and credit packs. Also stores credits and validity. |
| `coupons` | Coupon definitions (`percent`, `flat`, `free_days`). |
| `coupon_redemptions` | Reservation/usage record. Linked to an order through `order_id`. |
| `credit_transactions` | Append-only credit grant/debit/refund ledger. |
| `gateway_events` | Webhook idempotency table keyed by `(gateway, event_id)`. |
| `payments` | Exists in the schema but is **not used** by this implementation. `orders` is the purchase source of truth. |

### 4.2 Money units

- Razorpay expects **paise**.
- `plan_prices.amount` and `mrp_amount` are **paise**.
- `ai_credit_packs.price_inr` is **rupees**; backend converts it to paise.
- `orders.amount_inr`, `mrp_inr`, `discount_inr`, `refund_amount` are stored as **paise** despite the legacy column names.
- Minimum Razorpay amount is `100` paise (₹1). The backend rejects lower amounts.
- Client-supplied `amount_paise` is accepted for compatibility but **ignored**.

### 4.3 Order lifecycle

```text
pending ── payment captured / verified ──> paid ── full refund ──> refunded
   │
   └── payment failed / gateway start failed ──> failed
```

- `pending`: Razorpay order created; payment not confirmed.
- `paid`: payment verified; credits granted and/or subscription activated.
- `failed`: payment failed or checkout creation failed. Coupon reservation is released.
- `refunded`: full refund processed; credits deactivated, remaining balance reversed, linked subscription canceled.
- `is_active` controls whether paid credits contribute to the available balance.
- `starts_at` / `expires_at` control when the order’s credits are usable.
- `credits_remaining` is a generated column: `credits_total - credits_used`.

### 4.4 Why `catalog_plan_id` and `catalog_price_id` exist

The legacy `orders.plan_id` has a foreign key to `monthly_plans`. The new pricing page reads `plans` and `plan_prices`. Adding:

- `catalog_plan_id` → `plans.id`
- `catalog_price_id` → `plan_prices.id`

lets an order point at the public catalog without breaking the old constraint. The legacy `plan_id` is filled when the plan slug also exists in `monthly_plans`; otherwise it stays `NULL`.

---

## 5. API endpoints

Base path: `/api/v1/billing`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/config` | Public | Returns `{ configured, keyId }`. |
| `POST` | `/credits/orders` | Required | Create/reuse a credit-pack checkout. |
| `POST` | `/credits/verify` | Required | Verify payment and grant credits. |
| `GET` | `/credits/balance` | Required | Current plan + purchased credit balance. |
| `POST` | `/plans/orders` | Required | Create/reuse a plan checkout. |
| `POST` | `/plans/verify` | Required | Verify payment and activate/extend a plan. |
| `GET` | `/transactions` | Required | User order history (`?limit=50`, max 100). |
| `GET` | `/orders/:orderId` | Required | Status of one user-owned order (id or order number). |
| `POST` | `/webhook` | Razorpay signature | Public webhook; verified with `RAZORPAY_WEBHOOK_SECRET`. |

All authenticated routes read `req.user.userId` from `src/middleware/auth.ts` (session cookie or Bearer token).

### 5.1 Create credit-pack order

`POST /api/v1/billing/credits/orders`

Request:

```json
{
  "pack_id": "teacher",
  "amount_paise": 9900,
  "currency": "INR",
  "coupon": "TEACHER10"
}
```

- `pack_id` accepts either the pack code (`teacher`) or numeric id.
- `amount_paise` is ignored.
- `coupon` and `coupon_code` are both accepted.

Response `201`:

```json
{
  "success": true,
  "data": {
    "orderId": "123",
    "orderNo": "QS-20261026-A1B2C3",
    "razorpayOrderId": "order_XXXXXXXXXXXXXX",
    "amountPaise": 8910,
    "currency": "INR",
    "packId": "teacher",
    "credits": 50,
    "validityDays": 180,
    "keyId": "rzp_test_XXXXXXXX"
  }
}
```

### 5.2 Verify credit-pack payment

`POST /api/v1/billing/credits/verify`

Request:

```json
{
  "order_id": "123",
  "pack_id": "teacher",
  "razorpay_payment_id": "pay_XXXXXXXXXXXXXX",
  "razorpay_order_id": "order_XXXXXXXXXXXXXX",
  "razorpay_signature": "9f2c..."
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "transactionId": "QS-20261026-A1B2C3",
    "packId": "teacher",
    "credits": 50,
    "newBalance": 50
  }
}
```

`order_id` can be the backend numeric id or the `QS-...` order number. `pack_id` is optional; the server uses the order’s own pack.

### 5.3 Create plan order

`POST /api/v1/billing/plans/orders`

Request: exactly one of `plan_id` or `plan_slug`.

```json
{
  "plan_slug": "basic",
  "currency": "INR",
  "coupon": "NEWYEAR"
}
```

Response `201`:

```json
{
  "success": true,
  "data": {
    "orderId": "124",
    "orderNo": "QS-20261026-D4E5F6",
    "razorpayOrderId": "order_YYYYYYYYYYYYYY",
    "amountPaise": 9900,
    "currency": "INR",
    "planId": 2,
    "planSlug": "basic",
    "planName": "Basic",
    "credits": 50,
    "validityDays": 30,
    "keyId": "rzp_test_XXXXXXXX"
  }
}
```

### 5.4 Verify plan payment

`POST /api/v1/billing/plans/verify`

Request is the same shape as credit verification (`order_id`, payment id, Razorpay order id, signature).

Response `200`:

```json
{
  "success": true,
  "data": {
    "transactionId": "QS-20261026-D4E5F6",
    "orderId": "124",
    "planId": 2,
    "planSlug": "basic",
    "planName": "Basic",
    "credits": 50,
    "validityDays": 30,
    "startsAt": "2026-10-26T18:30:00.000Z",
    "expiresAt": "2026-11-25T18:30:00.000Z",
    "subscriptionId": 42,
    "newBalance": 50,
    "currency": "INR",
    "amountPaise": 9900
  }
}
```

### 5.5 Credit balance

`GET /api/v1/billing/credits/balance`

```json
{
  "success": true,
  "data": {
    "balance": 50,
    "planCredits": 20,
    "purchasedCredits": 30,
    "nearestExpiry": "2026-11-25T18:30:00.000Z"
  }
}
```

Only `paid`, `is_active`, started, unexpired orders with `credits_total > 0` are counted.

### 5.6 Transactions

`GET /api/v1/billing/transactions?limit=50`

Returns an array of compact order rows:

```json
[
  {
    "orderId": "124",
    "orderNo": "QS-20261026-D4E5F6",
    "orderType": "plan",
    "status": "paid",
    "amountPaise": 9900,
    "currency": "INR",
    "credits": 50,
    "creditsRemaining": 50,
    "validityDays": 30,
    "planSlug": "basic",
    "planName": "Basic",
    "packCode": null,
    "packName": null,
    "createdAt": "2026-10-26T18:29:00.000Z",
    "paidAt": "2026-10-26T18:30:00.000Z",
    "startsAt": "2026-10-26T18:30:00.000Z",
    "expiresAt": "2026-11-25T18:30:00.000Z",
    "isActive": true
  }
]
```

### 5.7 Error format

```json
{
  "success": false,
  "code": "PAYMENT_NOT_CAPTURED",
  "message": "Payment is not captured yet. Your account will be updated once the gateway confirms it."
}
```

Common codes:

| Code | HTTP | Meaning |
|---|---|---|
| `PAYMENT_GATEWAY_NOT_CONFIGURED` | 503 | Razorpay keys missing. |
| `WEBHOOK_NOT_CONFIGURED` | 503 | Webhook secret missing. |
| `INVALID_SIGNATURE` | 400 | Checkout/webhook HMAC mismatch. |
| `PACK_NOT_FOUND` / `PLAN_NOT_FOUND` | 404 | Item is inactive or not public. |
| `ORDER_NOT_FOUND` | 404 | Order does not exist for this user. |
| `ORDER_NOT_PAYABLE` | 409 | Order is canceled/refunded. |
| `CHECKOUT_IN_PROGRESS` | 409 | Another create request is in progress. Retry shortly. |
| `PAYMENT_NOT_CAPTURED` | 409 | Payment is authorized but not captured yet. |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Paid amount does not match the order. |
| `COUPON_*` | 400 | Invalid, expired, exhausted, not applicable, or already used. |
| `AMOUNT_TOO_LOW` | 400 | Payable amount is below ₹1. |

---

## 6. Complete credit-pack flow

### Step 1 — Frontend calls create order

Frontend: `src/services/aiCredits.ts` → `createCreditOrder()`

It sends `{ pack_id, amount_paise, currency, coupon? }`.

### Step 2 — Backend validates and prices the pack

1. `createCreditOrderHandler` (`src/controllers/billing.controller.ts`)
   - Calls `validate(createCreditOrderSchema)` from `src/middleware/billing.validate.ts`.
   - Calls `billingService.createCreditOrder()`.

2. `BillingService.createCreditOrder()` (`src/services/billing.service.ts`)
   - `requireGatewayConfig()` fails fast with `503` if keys are missing.
   - `findPurchasableCreditPack()` loads the active pack by code/id.
   - `resolveCurrency()` ensures the client did not choose a different currency.
   - `normalizeCouponCode()` normalizes the optional coupon.

### Step 3 — Reuse or create a pending local order

Inside `withTransaction()`:

1. `lockBillingUser()` takes `pg_advisory_xact_lock(72831, userId)`.
   - The same namespace is used by `src/services/entitlements/guards.ts` (`withEntitlementLock`), so a purchase cannot race an AI-credit debit for the same user.
2. `findReusablePendingOrder()` checks for the same user + pack + coupon.
   - If found, the existing Razorpay order is returned. This prevents double-clicks from creating two checkouts.
3. `createPendingOrder()`:
   - `resolveCouponForCheckout()` locks the coupon row and checks status, validity window, plan allowlist, global limit, and per-user limit.
   - `computeCouponDiscount()` calculates the discount in paise.
   - `insertOrder()` writes a `pending` order with:
     - `catalog_plan_id = NULL`
     - `pack_id`
     - server-owned `amount_inr`, `mrp_inr`, `discount_inr` (paise)
     - snapshot `credits_total`
     - `validity_days` (plus `free_days` coupon bonus)
   - `reserveCoupon()` writes `coupon_redemptions.order_id`.

If two concurrent requests still race, `uq_orders_open_checkout` (migration 63) raises a unique violation. `isUniqueViolation()` converts it to `409 CHECKOUT_IN_PROGRESS`.

### Step 4 — Create the Razorpay order

`startGatewayOrder()`:

- `RazorpayClient.createOrder()` calls `POST /orders` with:
  - `amount` in paise
  - `currency`
  - `receipt = orderNo`
  - `notes = { local_order_id, order_no, order_type, pack_id, pack_code }`
  - `payment_capture: 1`
- Checks the returned amount/currency match.
- `attachGatewayOrder()` stores `gateway_order_id` and the raw payload.
- On failure:
  - `markOrderFailed()` marks the pending order failed.
  - `releaseCouponReservation()` frees the coupon.
  - The client gets `502 PAYMENT_GATEWAY_ERROR`.

### Step 5 — Frontend opens Razorpay Checkout

Use the returned `razorpayOrderId`, `amountPaise`, `currency`, and key id. The current frontend function is `openRazorpayCheckout()` in `src/services/aiCredits.ts`.

### Step 6 — Frontend calls verify

After checkout success, the client sends the signed payment payload to `POST /credits/verify`.

`BillingService.verifyCreditOrder()`:

1. `findOrderForUser()` checks ownership by `userId`.
2. Rejects wrong order type.
3. If the order is already `paid`, returns the current balance without re-granting.
4. `verifySignatureAndPayment()`:
   - `verifyPaymentSignature()` checks `HMAC-SHA256(orderId + "|" + paymentId, keySecret)` in constant time.
   - `fetchPayment()` calls Razorpay `GET /payments/:id`.
   - `validateGatewayPayment()` checks:
     - payment belongs to this Razorpay order
     - amount equals `orders.amount_inr`
     - currency matches
     - status is `captured`
5. `withTransaction()` → `completeOrderTx()`:
   - `lockBillingUser()` + `findOrderByIdForUpdate()` (`FOR UPDATE`).
   - Reads `CURRENT_TIMESTAMP` from PostgreSQL, not Node, so `starts_at` cannot be a few milliseconds ahead of the DB clock.
   - If already paid, returns idempotently.
   - `completeOrderPaid()` sets `status='paid'`, `gateway_payment_id`, `paid_at`, `starts_at`, `expires_at`, `is_active=true`.
   - `getCreditBalance()` reads the new balance.
   - `insertCreditTransaction()` writes `+50`, reason `credit_pack_purchase`.
6. Response: `creditVerificationResult()` → `{ transactionId, packId, credits, newBalance }`.

### Step 7 — Webhook is the backup

If the browser closes before verify, Razorpay sends `payment.captured` (and possibly `order.paid`). The webhook runs the same `completeOrderTx()` and grants exactly once.

---

## 7. Complete plan flow

### Step 1 — Frontend calls plan order

`POST /api/v1/billing/plans/orders`

Body: `{ plan_id | plan_slug, coupon?, currency? }`.

There is no plan checkout UI yet; the API contract is ready for it.

### Step 2 — Backend prices the plan

`BillingService.createPlanOrder()`:

1. `requireGatewayConfig()`.
2. `findPurchasablePlan()`:
   - active + public + not default-free
   - latest active `monthly` price
   - `mrp_amount`
   - `ai_credits_per_month`
3. `resolveCurrency(plan.currency)`.
4. `findLegacyMonthlyPlanId(plan.slug)`:
   - `basic` / `pro` map to `monthly_plans` for older code.
   - New/renamed plans can return `NULL`; `catalog_plan_id` still works.
5. `validityDaysForPeriod()`:
   - monthly = 30
   - quarterly = 90
   - yearly = 365
   - custom_days = `custom_days`
   - lifetime = 36500
6. Reuse/create pending order exactly like credit packs, but sets:
   - `catalog_plan_id`
   - `catalog_price_id` (snapshot, so activation does not depend on the plan still being purchasable later)
   - `plan_id` (legacy, nullable)
   - `credits_total` = plan’s `ai_credits_per_month`

### Step 3 — Verify payment

`BillingService.verifyPlanOrder()` uses the same signature/payment validation as credit packs.

`completeOrderTx()` additionally calls `activatePlanSubscription()`.

### Step 4 — Subscription placement

`computeSubscriptionPlacement()` decides:

| Current subscription | Purchased plan | Result |
|---|---|---|
| `trialing` same plan | same plan | Convert to paid now; trial ends; new period starts now. |
| `active` same plan | same plan | Renewal: new period starts at `current_period_end`. |
| Free/another plan | different plan | Cancel current immediately; insert new subscription starting now. |
| None | any plan | Insert new subscription starting now. |

`activatePlanSubscription()`:

- Locks the current subscription via `findActiveSubscriptionForUpdate()` (`FOR UPDATE OF s`).
- `updateSubscriptionPeriod()` for conversion/renewal.
- `cancelSubscription()` + `insertSubscription()` for a plan change.
- Returns the exact `startsAt` / `expiresAt` used on the order.
- `requireOrderPriceId()` reads the `catalog_price_id` snapshot.

### Step 5 — Credits + entitlements

- `completeOrderPaid()` stores the plan order window.
- `insertCreditTransaction()` writes the plan credits with reason `plan_credit_grant`.
- `afterOrderActivated()` runs after commit:
  - `invalidateEntitlements(userId)` from `src/services/entitlement.service.ts` clears the 60-second Redis cache.
  - `writeSubscriptionAudit()` from `src/services/subscriptionAudit.service.ts` records the purchase.

The **new entitlement system** (`plans` + `plan_entitlements` + `subscriptions`) now drives access. The legacy `monthly_plans`/`orders` path is still populated for compatibility.

---

## 8. Complete webhook flow

### 8.1 Route and raw body

- `src/app.ts` configures `express.json({ verify })`.
- The verify callback stores `rawBody` **only** for `/api/v1/billing/webhook`.
- `src/routes/v1/index.ts` mounts `/billing` before the global `authenticate` guard.
- `src/routes/v1/billing.routes.ts` keeps `/webhook` public and applies `authenticate` only after it.
- `src/middleware/globalRateLimit.ts` bypasses the global rate limit for this path.

### 8.2 Handler

`razorpayWebhookHandler` (`src/controllers/billing.controller.ts`):

1. Reads `req.rawBody`.
2. Reads `x-razorpay-signature` and `x-razorpay-event-id`.
3. Calls `billingService.processWebhook()`.

### 8.3 Verification and idempotency

`BillingService.processWebhook()`:

1. `getRazorpayWebhookSecret()`; missing → `503 WEBHOOK_NOT_CONFIGURED`.
2. `verifyWebhookSignature()` with the **raw body**; mismatch → `400 INVALID_SIGNATURE`.
3. `webhookEventId()` uses the event-id header when ≤160 chars, otherwise SHA-256 of the raw body.
4. `withTransaction()`:
   - `recordGatewayEvent()` inserts into `gateway_events` with `ON CONFLICT DO NOTHING`.
   - If the insert returns no row, the event was already processed → return `{ duplicate: true }` with HTTP 200.
   - Otherwise process the event.
   - `markGatewayEventProcessed()`.
5. Commit.
6. For plan activation, `afterOrderActivated()` invalidates entitlements and writes the audit entry.

### 8.4 Events handled

| Event | Function | Action |
|---|---|---|
| `payment.captured` | `completeFromGatewayPayment()` → `completeOrderTx()` | Grants credits / activates plan. Idempotent if already paid. |
| `order.paid` | `completeFromGatewayPayment()` | Same, when the payload includes a captured payment entity. |
| `payment.failed` | `failFromGatewayPayment()` | Marks a **pending** order failed and releases the coupon. Never downgrades a paid order. |
| `refund.processed` | `refundFromGateway()` | Partial or full refund handling. |
| `payment.refunded` | `refundFromGateway()` | Same as above. |
| Other events | — | Recorded and acknowledged, no business action. |

### 8.5 Refund behavior

`refundFromGateway()`:

1. `findOrderByGatewayPaymentId()` finds the local order.
2. Locks user + order.
3. `cumulativeRefund = already refunded + this refund`.
4. If cumulative < order amount:
   - `recordPartialRefund()` only updates `refund_amount`; order stays active.
5. If cumulative >= order amount:
   - `refundOrder()` sets `status='refunded'`, `is_active=false`, `refunded_at`, `refund_amount`.
   - Cancels the linked subscription, if any.
   - Reverses remaining credits through `insertCreditTransaction()` with a negative amount and reason `refund`.
   - `afterOrderActivated()` refreshes entitlement cache for the plan user.

Note: a refund does **not** restore the coupon reservation. That is deliberate: the coupon was already consumed by the original purchase.

---

## 9. Function reference

### 9.1 Configuration — `src/config/razorpay.ts`

| Function | What it does |
|---|---|
| `readEnv(name)` | Reads and trims an env var; missing/blank → `""`. |
| `isRazorpayConfigured()` | True only when key id + key secret exist. |
| `getRazorpayConfig()` | Returns config or `null` if the key pair is incomplete. |
| `getRazorpayWebhookSecret()` | Returns the webhook secret independently of API keys. |

### 9.2 Razorpay client — `src/services/billing/razorpay.client.ts`

| Function | What it does |
|---|---|
| `RazorpayClient.constructor()` | Creates an Axios client with Basic Auth and a 15s timeout. |
| `RazorpayClient.createOrder()` | `POST /orders` with amount, currency, receipt, notes, auto-capture. |
| `RazorpayClient.fetchPayment()` | `GET /payments/:id` for server-side confirmation. |
| `RazorpayClient.fetchOrderPayments()` | `GET /orders/:id/payments` for reconciliation/support. |
| `gatewayMessage()` | Converts Axios/network errors into `RazorpayGatewayError`. |
| `gatewayErrorMessage()` | Returns a safe error string for logs/UI. |

### 9.3 Signatures — `src/services/billing/signatures.ts`

| Function | What it does |
|---|---|
| `hmacSha256Hex(secret, payload)` | Lowercase hex HMAC-SHA256. |
| `signaturesMatch(expected, received)` | Constant-time comparison; length mismatch fails first. |
| `verifyPaymentSignature()` | Verifies `orderId|paymentId` with the key secret. |
| `verifyWebhookSignature()` | Verifies raw webhook body with the webhook secret. |

### 9.4 Calculations — `src/services/billing/calculations.ts`

| Function | What it does |
|---|---|
| `addDays(date, days)` | Adds whole days in UTC milliseconds. |
| `validityDaysForPeriod(period, customDays)` | Maps billing period to 30/90/365/36500/custom days. |
| `orderNumber(now?)` | `QS-YYYYMMDD-XXXXXX` human-readable order number. |
| `computeCouponDiscount()` | Percent rounding, flat cap, free-days = 0 money discount. |
| `couponAppliesToPlan()` | Empty/missing plan allowlist = applies everywhere. |
| `computeSubscriptionPlacement()` | Trial conversion, same-plan renewal, plan replacement, or new subscription. |

### 9.5 Repository — `src/repositories/billing.repository.ts`

| Function | What it does |
|---|---|
| `findPurchasablePlan()` | Active/public/paid plan + latest monthly price + credit entitlement. |
| `findPurchasableCreditPack()` | Active pack by code or id. |
| `findCreditPackById()` | Pack by id even if deactivated (for old paid orders). |
| `findPlanSummaryById()` | Minimal plan identity for responses/audit. |
| `findLegacyMonthlyPlanId()` | Maps slug → `monthly_plans.id`, or `NULL`. |
| `lockCouponByCode()` | `FOR UPDATE` coupon lookup by case-insensitive code. |
| `getCouponUsage()` | Total and per-user redemption counts. |
| `reserveCoupon()` | Inserts `coupon_redemptions` for a pending order. |
| `releaseCouponReservation()` | Deletes the reservation on failure. |
| `findReusablePendingOrder()` | Finds an existing unpaid checkout for reuse. |
| `findOrderForUser()` | Order by id/order number scoped to the user. |
| `findOrderByIdForUpdate()` | Locks one order for payment/refund processing. |
| `findOrderByGatewayOrderId()` | Maps Razorpay order id → local order. |
| `findOrderByGatewayPaymentId()` | Maps Razorpay payment id → local order (refunds). |
| `insertOrder()` | Inserts a pending order with price/credits snapshot. |
| `attachGatewayOrder()` | Stores Razorpay order id + raw payload. |
| `markOrderFailed()` | Pending → failed with reason. |
| `completeOrderPaid()` | Pending/failed → paid with payment, window, credits, subscription. |
| `refundOrder()` | Paid → refunded, deactivate credits, record refund amount. |
| `recordPartialRefund()` | Accumulates partial refunds without deactivating. |
| `listUserOrders()` | User order history with plan/pack names. |
| `findActiveSubscriptionForUpdate()` | Locks current active/trial/past-due subscription. |
| `updateSubscriptionPeriod()` | Conversion/renewal: updates price and period, clears trial/cancel fields. |
| `cancelSubscription()` | Immediate cancel with reason. |
| `insertSubscription()` | Creates a new active subscription. |
| `getCreditBalance()` | Sums active, started, unexpired credits by bucket. |
| `insertCreditTransaction()` | Appends grant/debit/refund ledger entries. |
| `recordGatewayEvent()` | Webhook idempotency insert (`ON CONFLICT DO NOTHING`). |
| `markGatewayEventProcessed()` | Marks the event processed after business work. |

### 9.6 Service helpers — `src/services/billing.service.ts`

| Function | What it does |
|---|---|
| `withTransaction()` | BEGIN/COMMIT/ROLLBACK + releases the pooled client. |
| `requireGatewayConfig()` | Throws `503 PAYMENT_GATEWAY_NOT_CONFIGURED` when the key pair is missing. |
| `lockBillingUser()` | User-level advisory lock; shared with AI-credit debits. |
| `normalizeCouponCode()` | Trims and blanks-to-null. |
| `isUniqueViolation()` | Detects `23505` for a named constraint. |
| `resolveCurrency()` | Rejects a client currency different from the catalog. |
| `requireAmount()` | Enforces the ₹1 gateway minimum. |
| `planOrderNotes()` | Razorpay notes for a plan checkout. |
| `packOrderNotes()` | Razorpay notes for a credit-pack checkout. |
| `resolveCouponForCheckout()` | Locks/validates a coupon and computes discount + bonus days. |
| `createPendingOrder()` | Inserts the local order and reserves its coupon. |
| `startGatewayOrder()` | Creates/attaches the Razorpay order; marks failure + releases coupon on error. |
| `creditOrderResponse()` | Maps a credit order to the frontend response. |
| `planOrderResponse()` | Maps a plan order to the frontend response. |
| `activatePlanSubscription()` | Converts/extends/cancels/creates subscription rows. |
| `requireOrderPriceId()` | Requires the stored plan price snapshot. |
| `validateGatewayPayment()` | Checks order id, amount, currency, captured status. |
| `completeOrderTx()` | The single idempotent payment-completion transaction. |
| `afterOrderActivated()` | Post-commit cache invalidation + subscription audit. |
| `verifySignatureAndPayment()` | Checkout HMAC + Razorpay payment fetch + validation. |
| `creditVerificationResult()` | Credit verify response shape. |
| `planVerificationResult()` | Plan verify response shape. |
| `asRecord()` | Safe JSON object narrowing. |
| `extractPayment()` | Pulls a payment entity from a webhook payload. |
| `extractRefund()` | Pulls a refund entity from a webhook payload. |

### 9.7 Service methods — `BillingService`

| Method | What it does |
|---|---|
| `isConfigured()` | Whether checkout can run. |
| `getPublicConfig()` | Non-secret `{ configured, keyId }`. |
| `createCreditOrder()` | Reuse/create pending pack order + Razorpay order. |
| `createPlanOrder()` | Reuse/create pending plan order + Razorpay order. |
| `verifyCreditOrder()` | Verify signature/payment and grant credits once. |
| `verifyPlanOrder()` | Verify signature/payment and activate/extend plan once. |
| `getCreditBalance()` | Balance summary. |
| `listOrders()` | User transaction history. |
| `getOrder()` | One order status for polling. |
| `processWebhook()` | Verify, deduplicate, dispatch, commit. |
| `webhookEventId()` | Event header or raw-body hash. |
| `completeFromGatewayPayment()` | Captured payment → order completion. |
| `failFromGatewayPayment()` | Failed payment → failed order + coupon release. |
| `refundFromGateway()` | Partial/full refund processing. |

### 9.8 Controllers — `src/controllers/billing.controller.ts`

| Function | Endpoint |
|---|---|
| `getBillingConfigHandler` | `GET /config` |
| `createCreditOrderHandler` | `POST /credits/orders` |
| `verifyCreditOrderHandler` | `POST /credits/verify` |
| `createPlanOrderHandler` | `POST /plans/orders` |
| `verifyPlanOrderHandler` | `POST /plans/verify` |
| `getCreditBalanceHandler` | `GET /credits/balance` |
| `listTransactionsHandler` | `GET /transactions` |
| `getOrderHandler` | `GET /orders/:orderId` |
| `razorpayWebhookHandler` | `POST /webhook` |
| `userIdFrom` | Reads authenticated user id. |
| `sendBillingError` | Maps `BillingError` or unknown errors to the API envelope. |
| `headerValue` | Normalizes repeated headers. |

### 9.9 Validation — `src/middleware/billing.validate.ts`

| Schema | Used by |
|---|---|
| `createCreditOrderSchema` | Credit order creation. |
| `createPlanOrderSchema` | Plan order creation (`plan_id` or `plan_slug`). |
| `verifyOrderSchema` | Both verify endpoints. |

Validation intentionally ignores `amount_paise`. **The server never trusts client prices.**

---

## 10. Idempotency, locking, and race safety

| Mechanism | Where | Why |
|---|---|---|
| `pg_advisory_xact_lock(72831, userId)` | `lockBillingUser()` | Serializes purchases, verification, refunds, and AI-credit debits for one user. |
| `SELECT ... FOR UPDATE` on `orders` | `findOrderByIdForUpdate()` | Two verify/webhook calls cannot both grant. |
| `SELECT ... FOR UPDATE` on `coupons` | `lockCouponByCode()` | Concurrent checkouts cannot exceed coupon limits. |
| `gateway_events UNIQUE(gateway, event_id)` | `recordGatewayEvent()` | Razorpay retries are processed once. |
| `uq_orders_open_checkout` | Migration 63 | One open pending checkout per user/item/coupon. |
| Reusable pending order | `findReusablePendingOrder()` | Double-click reuses the same Razorpay order. |
| `status='paid'` early return | `completeOrderTx()` | Repeated verify/webhook is a no-op. |
| DB `CURRENT_TIMESTAMP` | `completeOrderTx()` | Avoids app/DB clock skew when setting `starts_at`. |
| `credits_used` guarded updates | `src/services/entitlements/guards.ts` | Debits cannot make credits negative. |

### Order of locks

1. Advisory user lock.
2. Order row lock.
3. Subscription row lock (plan only).
4. Coupon row lock (create only).

Every path follows this order to avoid deadlocks, except coupon creation which only locks the coupon and then inserts the order. Coupons and orders are not locked in the opposite order anywhere.

---

## 11. Razorpay dashboard setup

1. Log in to Razorpay Dashboard.
2. Get **Key ID** and **Key Secret** from Settings → API Keys (test mode first).
3. Put them in backend `.env`.
4. Create a webhook:
   - URL: `https://<your-backend-domain>/api/v1/billing/webhook`
   - Secret: same value as `RAZORPAY_WEBHOOK_SECRET`
   - Active events:
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `refund.processed`
     - `payment.refunded` (optional but recommended)
5. For local development, expose the backend with a tunnel (the repo has a `cloudflared/` folder) and use the public HTTPS URL in the webhook.
6. Test with Razorpay test-mode keys. Test-mode payments never move real money.
7. Switch to live keys and a live webhook secret before launch.

Important:

- The webhook URL must be public and HTTPS.
- Razorpay signs the **raw body**; do not add middleware that rewrites the JSON before signature verification.
- The backend stores the event id, so retries are safe.

---

## 12. Database migrations

Apply in order:

```bash
# See what is pending
npm run migration:dry

# Apply all pending migrations (check the list first)
npm run migrate

# Or apply only the billing migrations
npx tsx src/migrate.ts --only=62_razorpay_billing.sql
npx tsx src/migrate.ts --only=63_billing_checkout_idempotency.sql
```

What 62 does:

- Adds `orders.catalog_plan_id`
- Adds `orders.catalog_price_id`
- Adds `orders.subscription_id`
- Adds `orders.coupon_id`, `coupon_code`
- Adds `orders.gateway_signature`, `gateway_payload`
- Adds `orders.failure_reason`, `refund_amount`
- Replaces `chk_order_item` so plan orders may use `catalog_plan_id` instead of legacy `plan_id`
- Adds `coupon_redemptions.order_id` with a unique partial index
- Adds lookup indexes

What 63 does:

- Adds `uq_orders_open_checkout`, the unique partial index for open checkouts.

> **Warning:** the live database may still have other pending migrations (for example `60_pricing_catalog.sql` and `61_platform_catalog_drafts.sql`). Review `npm run migration:dry` before running a full `npm run migrate`.

---

## 13. Testing

### Unit tests

```bash
cd code-judge-backend
npm run test:billing
npm run build
```

`test:billing` covers:

- Percent/flat/free-day coupon math
- Coupon plan allowlists
- Validity periods
- Order number format/uniqueness
- Checkout and webhook HMAC signatures
- Trial conversion, same-plan renewal, plan replacement, and new subscription placement

### Start the API locally

```bash
cd code-judge-backend
DISABLE_BACKGROUND_WORKERS=1 PORT=8099 npx tsx src/server.ts
```

### Check configuration

```bash
curl http://localhost:8099/api/v1/billing/config
```

Expected when keys are missing:

```json
{"success":true,"data":{"configured":false,"keyId":null}}
```

### Check auth boundary

```bash
curl -i -X POST http://localhost:8099/api/v1/billing/credits/orders \
  -H 'Content-Type: application/json' \
  -d '{"pack_id":"teacher","amount_paise":9900,"currency":"INR"}'
```

Expected: `401 Authentication required`.

### Manual webhook signature test

```bash
BODY='{"event":"payment.captured"}'
SIGNATURE=$(node -e "const {createHmac}=require('crypto');console.log(createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(process.argv[1]).digest('hex'))" "$BODY")

curl -i -X POST http://localhost:8099/api/v1/billing/webhook \
  -H 'Content-Type: application/json' \
  -H "x-razorpay-signature: $SIGNATURE" \
  -H 'x-razorpay-event-id: test-event-1' \
  -d "$BODY"
```

A correctly signed, unknown event returns `200` and is recorded. An invalid signature returns `400 INVALID_SIGNATURE`.

---

## 14. Production checklist

- [ ] Apply migrations 62 and 63 (and review any other pending migrations).
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Set frontend `NEXT_PUBLIC_RAZORPAY_KEY_ID` or use the `keyId` returned by the API.
- [ ] Configure the Razorpay webhook URL and events.
- [ ] Verify `GET /billing/config` reports `configured: true`.
- [ ] Run a test-mode credit-pack purchase end to end.
- [ ] Run a test-mode plan purchase end to end.
- [ ] Test a failed payment and confirm the order becomes `failed` and the coupon is released.
- [ ] Test a webhook retry and confirm credits are not duplicated.
- [ ] Test a full refund and confirm credits/subscription are deactivated.
- [ ] Confirm Redis is running (auth and entitlement cache).
- [ ] Confirm the backend has HTTPS in production.
- [ ] Fix the live Pro price if needed (see below).

### Pre-launch data checks

At the time of implementation, the live DB showed:

- `basic` monthly price: `9900` paise (₹99) — expected.
- `pro` monthly price: `199100` paise (₹1991) — **likely a typo for `19900` (₹199)**.
- `basic` `ai_credits_per_month`: `50` in the live entitlements.
- `pro` `ai_credits_per_month`: `50` in the live entitlements.

`database/migrations/60_pricing_catalog.sql` is still pending on the live DB. It updates the active monthly prices (Pro → `19900`) and inserts missing entitlements with `ON CONFLICT DO NOTHING`. It does **not** overwrite existing entitlement rows, so if Basic should grant a different number of credits, fix that through the platform admin UI or a deliberate data migration.

**Do not launch paid checkout until the Pro price is confirmed.**

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 PAYMENT_GATEWAY_NOT_CONFIGURED` | Missing `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. | Set both in `.env`, restart the API. |
| `503 WEBHOOK_NOT_CONFIGURED` | Missing `RAZORPAY_WEBHOOK_SECRET`. | Set the webhook secret. |
| `400 INVALID_SIGNATURE` on verify | Wrong key secret, wrong Razorpay order id, or modified payment id. | Check the key pair and the exact checkout response. |
| `400 INVALID_SIGNATURE` on webhook | Wrong webhook secret or body was modified before verification. | Use the dashboard webhook secret and keep raw-body capture enabled. |
| `409 PAYMENT_NOT_CAPTURED` | Razorpay authorized but did not capture yet. | Wait for `payment.captured`; the webhook will activate it. |
| `400 PAYMENT_AMOUNT_MISMATCH` | Price changed after order creation or wrong order/payment pair. | Create a fresh order; never pay an old checkout after a price change. |
| Credits not visible after success | Order not `paid`, `is_active=false`, or starts/expiry window not active. | Check `GET /billing/orders/:id`; check `starts_at`/`expires_at`; verify webhook. |
| Plan access not updated | Entitlement cache still warm (60s) or subscription not active. | Check `subscriptions`; confirm `invalidateEntitlements()` ran; wait 60s. |
| `409 CHECKOUT_IN_PROGRESS` | Two create requests raced. | Retry after a moment; the first request is creating the Razorpay order. |
| Webhook returns `400` but Razorpay dashboard shows retries | Signature secret mismatch. | Fix `RAZORPAY_WEBHOOK_SECRET`; retries are safe/idempotent. |
| Global rate limit blocks webhook | Bypass path missing or URL differs. | Confirm `/api/v1/billing/webhook` is in `BYPASS_PATHS`. |
| Pro plan charges ₹1991 | Live `plan_prices` data is wrong. | Fix the price (migration 60 or platform UI) before accepting payments. |

---

## 16. Known limitations / next steps

1. **No plan checkout UI yet.** The backend endpoints exist; `MonthlyPlansPage` currently links to pricing/register.
2. **Razorpay Subscriptions API is not used.** Monthly plans are one-time Razorpay Orders; renewal is manual (user buys again). Auto-renew mandates/SI are future work.
3. **No invoice/GST generation.** `payments` table and invoice fields are not populated.
4. **No admin refund UI.** Refunds are processed by Razorpay webhooks.
5. **`free_days` coupons** add validity days but do not reduce money. A 100% percent/flat coupon that makes the amount below ₹1 is rejected.
6. **Refunds do not restore coupons.** The original redemption remains consumed.
7. **Frontend still reads `NEXT_PUBLIC_RAZORPAY_KEY_ID`.** The API also returns `keyId`, so the frontend can be simplified later.
8. **No automated gateway integration tests.** Unit tests cover pure logic/signatures; Razorpay test-mode checkout should be exercised manually.
