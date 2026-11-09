# AI Credits & Recent Usage

This document explains the AI credit system end to end: where credits come from,
how they are spent, how balances and expirations are calculated, and how the
**Recent AI usage** section in the Billing Overview is wired.

> Credit rules are enforced by the **backend**. The frontend only mirrors the
> server balance for display and optimistic UX. Never trust client-side balances
> for authorization.

---

## 1. Quick model

| Concept | Value |
| --- | --- |
| Spending unit | AI credit |
| Tokens per credit | `1,000` (`TOKENS_PER_AI_CREDIT`) |
| Token source | Provider-reported usage (input + output + reasoning) |
| Rounding | `ceil(tokens / 1000)`, minimum charge `1` |
| Charge timing | **After** generation completes |
| Pre-check | Balance must be `> 0` before generation starts |
| Storage | `orders` (credit buckets) + `credit_transactions` (append-only ledger) |
| Balance unit | Remaining credits across all active, unexpired orders |
| Expiry | Per order (`expires_at`); expired credits are excluded from balance |

Key files:

- `src/services/aiCredits.service.ts` — token → credit conversion, pre-check, charge
- `src/services/entitlements/guards.ts` — FIFO debit, refund, per-user locking
- `src/repositories/billing.repository.ts` — `getCreditBalance`, ledger insert
- `src/controllers/ai.controller.ts` — AI endpoints that call `chargeAiUsage`
- `src/controllers/testSection.controller.ts` — paper/section/quiz generation charges
- `src/services/syllabusBreakdown.service.ts` — pre-debit syllabus import flow

---

## 2. Where the Recent AI usage section lives

Frontend: [`BillingDashboard.tsx`](../../code-judge-frontend/src/components/creator/billing/BillingDashboard.tsx)

- Route: `/creator/billing` (Billing Overview)
- Component: `RecentUsageCard`
- Headline: **“Recent AI usage — Latest credit-consuming operations”**
- Shows at most 6 entries, newest first.
- Each row renders:
  - `entry.featureLabel` — human-readable operation name
  - `formatTime(entry.timestamp)` — localized date/time
  - `−entry.credits` — credits debited
  - a status chip: `success`, `refunded`, or `failed`
- The **All** link goes to `/creator/billing/transactions` (purchase history).
- Empty state: **“No AI usage yet — Generate a paper or quiz and your usage will show up here.”**

A second view exists in [`AICreditsDashboard.tsx`](../../code-judge-frontend/src/components/ai/AICreditsDashboard.tsx)
under the title **Usage History**, which additionally shows `promptSizeKB`.

### Entry type

```ts
interface AICreditUsageEntry {
  id: string;
  featureId: AICreditFeatureId;
  featureLabel: string;
  credits: number;
  status: "success" | "refunded" | "failed";
  timestamp: number;          // epoch ms
  promptSizeKB?: number;
  responseSizeKB?: number;
}
```

### Current data flow

```
BillingDashboard
  └─ useBillingData(loader)
       └─ loader reads useAICreditsStore.getState()
            ├─ balance  ── GET /api/v1/billing/credits/balance
            └─ stats.recentRequests
  └─ <RecentUsageCard entries={data.stats.recentRequests} />
```

The store initializes `stats.recentRequests` to `[]` (`EMPTY_STATS`) and
`refresh()` currently updates only balance figures. **No backend endpoint
returns per-request AI history yet**, so this section intentionally renders its
empty state. The source of truth for the data already exists in
`credit_transactions`; see §10 for the suggested wiring.

---

## 3. Data model

### `orders` — the credit bucket table

Every purchased or granted block of credits is an order:

| Column | Meaning |
| --- | --- |
| `order_type` | `plan`, `credit_pack`, or `bundle` |
| `credits_total` | Credits granted by this order |
| `credits_used` | Credits consumed from this order |
| `credits_remaining` | Generated stored column: `credits_total - credits_used` |
| `starts_at` / `expires_at` | When the credits become spendable / stop counting |
| `status` | `pending`, `paid`, `failed`, `refunded`, `cancelled` |
| `is_active` | Must be `TRUE` to be spendable |
| `pack_id` | Credit pack catalogue reference (for pack/bundle grants) |
| `plan_id` / `catalog_plan_id` | Plan reference (for plan grants) |
| `parent_order_id` / `bundle_id` | Links bundle child grants to the parent |

### `credit_transactions` — append-only ledger

| Column | Meaning |
| --- | --- |
| `amount` | Positive = granted/refunded, negative = spent |
| `reason` | Machine-readable operation (`ai_chat`, `plan_credit_grant`, …) |
| `ref_id` | Idempotency key / correlation id (request id, order no, referral key) |
| `balance_after` | Balance snapshot immediately after the transaction |
| `order_id` | Which credit bucket was affected |

The ledger never stores a “status” column; successful debits are negative rows,
refunds are positive rows.

### `ai_credit_packs` — purchasable credit packs

Seeded/migrated in `database/migrations/50_subscriptions.sql` and later pricing
migrations. Public catalogue is served by `/api/v1/pricing`.

---

## 4. How credits are ADDED

All grants create (or reuse) a paid `orders` row and append a positive
`credit_transactions` row.

| Source | Reason code | Where |
| --- | --- | --- |
| Plan purchase / renewal | `plan_credit_grant` | `billing.service.ts` → `completeOrderTx` |
| Credit pack purchase | `credit_pack_purchase` | `billing.service.ts` → `completeOrderTx` |
| Bundle purchase | `plan_credit_grant` + `credit_pack_purchase` | `grantBundleChildrenTx` |
| Approved trial request | `trial_credit_grant` | `trialRequest.service.ts` |
| Referral reward (both sides) | `referral_referrer_reward` / `referral_referred_reward` | `referral.service.ts` |
| Refund of spent AI credits | `ai_refund` | `entitlements/guards.ts` → `refundAiCredits` |
| Gateway refund of an order | `refund` (negative) | `billing.service.ts` refund handler |

### Purchase flow

```
POST /api/v1/billing/credits/orders        create pending order + Razorpay order
        │
        ▼
Razorpay checkout (client)
        │
        ▼
POST /api/v1/billing/credits/verify        verify signature
        │
        ▼
completeOrderTx
  ├─ lock user row
  ├─ mark order paid, set starts_at/expires_at
  ├─ activate/queue subscription (plans)
  ├─ grant credits to orders
  └─ append credit_transactions
        │
        ▼
GET /api/v1/billing/credits/balance        refreshed balance
```

- The same logic runs from the Razorpay **webhook** (`POST /api/v1/billing/webhook`)
  so a browser that closes mid-checkout still receives credits.
- Webhook events are de-duplicated via `gateway_events` (`recordGatewayEvent`).
- Orders are the entitlement source of truth; the client never decides amounts
  or credits.

### Plan credits

A plan order stores `ai_credits_per_month` as `credits_total` and gives the
order the plan's validity window (`validityDaysForPeriod`). Renewals create a
new order and therefore grant a fresh block. There is no separate “reset”
mutation: monthly credits simply age out when their order expires.

### Trial credits

When a platform admin approves a trial request, the backend creates a
zero-value paid order and appends `trial_credit_grant`. The credits expire
with the trial period.

### Referral credits

- Reward constant: `REFERRAL_REWARD_CREDITS = 50` for each side.
- Triggered when the referred user makes their first paid plan purchase
  (`qualifyReferralForFirstPlanTx`).
- Implemented as a hidden, zero-price `referral_bonus` pack (validity 180 days)
  so referral credits spend through the same order/FIFO path as purchased
  credits.
- Idempotency is enforced by a unique index on
  `(user_id, ref_id)` for referral reward reasons.

---

## 5. How credits are REDUCED

### 5.1 Pre-flight check

AI routes run `requireAiCredits` (`src/middleware/requireAiCredits.ts`), which
calls `assertAiCreditsAvailable`:

- Computes the current balance from `orders`.
- Rejects with `403 NO_AI_CREDITS` if the total is `0`.
- It does **not** reserve credits; it only guarantees a positive balance.

This middleware is used by:

- `POST /api/v1/user/ai/chat`
- `POST /api/v1/user/ai/chat-files`
- `POST /api/v1/user/ai/generate-questions`
- `POST /api/v1/user/ai/generate-from-bank`

### 5.2 Token-based charge after generation

After the model reports usage, the controller calls:

```ts
chargeAiUsage({ userId, usage, reason, refId })
```

Internally:

1. `totalTokensForUsage()` uses `totalTokens`, or falls back to
   `inputTokens + outputTokens`.
2. `creditsForTokens()` applies `ceil(tokens / 1000)` with a minimum of `1`.
3. Zero-token responses are **not** charged.
4. `debitAiCredits()` consumes credits from the user's orders (FIFO).
5. Returns `{ creditsCharged, tokensUsed, creditsRemaining }` to the client.

The charge is included in the response:

- JSON endpoints: `data.credits`
- SSE endpoints: a `usage` event containing `{ usage, credits }`

### 5.3 FIFO allocation

`debitAiCredits` locks the user (`pg_advisory_xact_lock`) and selects eligible
orders:

```sql
WHERE user_id = $1
  AND status = 'paid'
  AND is_active = TRUE
  AND credits_total > 0
  AND credits_remaining > 0
  AND starts_at <= now
  AND expires_at > now
ORDER BY expires_at ASC, id ASC
FOR UPDATE
```

Credits expiring soonest are consumed first. Each affected order gets
`credits_used += amount` and the ledger gets one negative row.

If the available total is insufficient, the whole transaction rolls back and
throws `EntitlementError("NO_AI_CREDITS")`.

### 5.4 Debit reason codes

| Reason | Trigger |
| --- | --- |
| `ai_chat` | Streaming chat |
| `ai_chat_files` | Streaming chat with uploaded documents |
| `ai_generate_questions` | AI question generation (material or sections) |
| `ai_generate_bank` | Question-bank topic generation |
| `ai_generate_sections` | Test-paper section generation |
| `ai_generate_paper` | Full paper generation |
| `ai_syllabus_import` | Syllabus import (pre-debited, see below) |

### 5.5 Syllabus import (pre-debit + refund)

Unlike model calls, syllabus import charges a fixed `creditCost` **before**
work starts:

1. Assert balance.
2. `debitAiCredits` with `reason: "ai_syllabus_import"` and
   `refId: "syllabus_import:<jobId>"`.
3. Create the job; if job creation fails, `refundAiCredits` reverses it.
4. If the import worker fails, the job handler refunds the same `refId`.

`refundAiCredits` is idempotent: it skips if a positive transaction with the
same `refId` already exists, then appends `ai_refund` rows and decrements
`credits_used` on the original orders.

### 5.6 Gateway refunds

When Razorpay reports a full refund:

- Order becomes `refunded`; active subscription is cancelled.
- Unused credits (`credits_remaining > 0`) are removed from the bucket with a
  negative `refund` ledger entry.
- Credits already spent are not clawed back beyond the order's remaining
  balance.

---

## 6. Balance calculation

`getCreditBalance(userId)` in `billing.repository.ts`:

```sql
SELECT SUM(credits_remaining) AS total,
       SUM(credits_remaining) FILTER (WHERE order_type = 'plan')         AS plan_credits,
       SUM(credits_remaining) FILTER (WHERE order_type = 'credit_pack')  AS purchased_credits,
       SUM(credits_total)     FILTER (WHERE order_type = 'plan')         AS plan_credits_total,
       SUM(credits_total)     FILTER (WHERE order_type = 'credit_pack')  AS purchased_credits_total,
       MIN(expires_at)                                                    AS nearest_expiry
FROM orders
WHERE user_id = $1
  AND status = 'paid'
  AND is_active = TRUE
  AND credits_total > 0
  AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
```

Notes:

- Expired orders are **not** mutated; they are simply excluded from the sum.
- `credits_remaining` is a generated stored column, so it is always
  `credits_total - credits_used`.
- `nearestExpiry` powers “credits expiring soon” in the entitlements snapshot.

Endpoint: `GET /api/v1/billing/credits/balance`

```json
{
  "balance": 120,
  "planCredits": 20,
  "purchasedCredits": 100,
  "planCreditsTotal": 100,
  "purchasedCreditsTotal": 50,
  "nearestExpiry": "2026-12-31T00:00:00.000Z"
}
```

---

## 7. Concurrency & idempotency

- **Per-user lock:** `withEntitlementLock` takes
  `pg_advisory_xact_lock(72831, userId)` inside a transaction, so two
  simultaneous AI charges cannot overspend the same bucket.
- **Row locks:** eligible orders are selected `FOR UPDATE`.
- **Atomic update:** `UPDATE orders SET credits_used = credits_used + $1
  WHERE id = $2 AND credits_remaining >= $1` guards against races.
- **Ledger idempotency:** refunds check `credit_transactions` by `(user_id,
  ref_id)`.
- **Referral idempotency:** unique partial index on referral reward rows.
- **Payment idempotency:** `gateway_events` + unique gateway payment/order
  indexes + `status = 'paid'` short-circuit.

---

## 8. Frontend credit state

Store: `code-judge-frontend/src/store/aiCreditsStore.ts`

- `balance` — server snapshot mapped into UI fields.
- `refresh()` — calls `getCreditBalance()`, updates plan/purchased totals,
  consumed amounts, and remaining.
- `syncServerBalance(remaining)` — applies the authoritative value returned
  after an AI charge (`services/ai.ts` → `syncServerCredits`).
- `consumeCredits()` / `refundCredits()` — legacy in-memory estimate helpers
  (fair-usage/abuse metadata). Real money/credits are always charged by the
  backend.
- `purchasePack()` — optimistic local update; the server grant is authoritative.

Credit errors surface through `UpgradeModal` when the API returns
`NO_AI_CREDITS`, and through the low-credit banner
(`LowCreditNotification.tsx`) when remaining falls below 20% of the monthly
allowance.

> `src/config/aiCredits.ts` contains `AI_CREDIT_COSTS` (e.g. “AI Hint = 1
> credit”). These are legacy/estimated per-feature prices used by the demo
> store. Actual billing is token-based as described above.

---

## 9. API reference

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/billing/credits/balance` | Current credit balance |
| `POST` | `/api/v1/billing/credits/orders` | Create a credit-pack order |
| `POST` | `/api/v1/billing/credits/verify` | Verify Razorpay payment and grant credits |
| `POST` | `/api/v1/billing/plans/orders` | Create a plan order |
| `POST` | `/api/v1/billing/plans/verify` | Verify plan payment and grant plan credits |
| `POST` | `/api/v1/billing/bundles/orders` | Create a plan + pack bundle order |
| `POST` | `/api/v1/billing/bundles/verify` | Verify bundle payment |
| `POST` | `/api/v1/billing/webhook` | Razorpay webhook (grants/refunds) |
| `GET` | `/api/v1/billing/transactions` | Order/purchase history |
| `POST` | `/api/v1/user/ai/chat` | Streaming chat (charged after response) |
| `POST` | `/api/v1/user/ai/chat-files` | Streaming chat with documents |
| `POST` | `/api/v1/user/ai/generate-questions` | Question generation |
| `POST` | `/api/v1/user/ai/generate-from-bank` | Topic-based generation |

---

## 10. Wiring real “Recent AI usage” data (next step)

The ledger already records every debit/refund. To populate the section, add a
read endpoint that returns recent `credit_transactions` joined to order/ref
metadata, for example:

```sql
SELECT ct.id,
       ct.reason,
       ct.ref_id,
       ct.amount,
       ct.balance_after,
       ct.created_at,
       ct.order_id
FROM credit_transactions ct
WHERE ct.user_id = $1
  AND (ct.reason LIKE 'ai_%' OR ct.reason = 'refund')
ORDER BY ct.created_at DESC
LIMIT $2;
```

Then map rows to the frontend entry shape:

| Ledger | UI field |
| --- | --- |
| `reason` | `featureId` / label (`ai_chat` → “AI Chat”) |
| `created_at` | `timestamp` |
| `amount` | `credits` (`abs(amount)`); negative = spend |
| `reason = 'ai_refund'` or `refund` | `status: "refunded"` |
| failed generation (no ledger row) | `status: "failed"` (optional) |

Suggested endpoint: `GET /api/v1/billing/credits/usage?limit=20`, then update
`useAICreditsStore.refresh()` to write `stats.recentRequests` (and optionally
`perFeature`, `monthlyGraph`, `consumedToday`/`consumedThisMonth`,
`averageDailyUsage`, `estimatedDaysRemaining`).

Until that exists, the **Recent AI usage** card correctly shows its empty
state rather than fabricated data.

---

## 11. Quick troubleshooting

| Symptom | Check |
| --- | --- |
| Charge fails with `NO_AI_CREDITS` | `getCreditBalance`; are orders `paid`, `is_active`, started, unexpired? |
| Credits missing after payment | `orders.status`, `gateway_events`, verify/webhook logs |
| Balance is lower than expected | Expired orders are excluded; spend is FIFO by nearest expiry |
| Charge not recorded | Zero-token responses are not billed; check provider `usage` payload |
| Duplicate charges | Verify each AI request uses a unique `refId` (`randomUUID`) |
| Recent usage always empty | No history endpoint is wired yet; see §10 |
