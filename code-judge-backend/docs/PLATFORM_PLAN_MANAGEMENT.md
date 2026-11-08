# Managing plans from the platform console

This document explains how plans are managed from `/platform` (the pricing
console), including the plan lifecycle, draft/publish workflow, pricing and
entitlements, subscriber-safe price changes, archive/delete rules, and how the
public catalog picks the result up.

Related reading:

- [Country-wise plan pricing](./COUNTRY_WISE_PRICING.md) - regional Elevate
  prices, geo detection, and checkout snapshots.
- [Razorpay billing flow](./RAZORPAY_BILLING_FLOW.md) - how a published plan
  becomes an order and a subscription.

## At a glance

```text
/platform/pricing  (Plans tab)
    |
    |  create -> edit -> save draft -> publish
    v
plans + plan_prices + plan_entitlements      (live catalog tables)
    |
    |  status = active AND (is_public OR is_default_free) AND active monthly price
    v
GET /api/v1/pricing                           (public catalog)
    |
    +--> /pricing (marketing pages, SSR)
    +--> /creator/billing/plans (creator billing)
    |
    v
POST /api/v1/billing/... -> Razorpay checkout -> subscription
```

## 1. Where plan management lives

- Console URL: `/platform/pricing`.
- The pricing console has five tabs: **Plans**, **Countries**, **Credit packs**,
  **Coupons**, and **Page content**. This document covers the Plans tab; the
  Countries tab is documented in
  [COUNTRY_WISE_PRICING.md](./COUNTRY_WISE_PRICING.md).
- Every API route is owner-only. Requests are gated by `requireOwner` in
  `src/middleware/requireOwner.ts` and mounted under `/api/v1/platform`
  **before** the regular-user auth guard, because the platform console uses an
  isolated `platform_session` instead of `session_token`.
- Plan routes live in `src/routes/v1/platformSubscriptions.routes.ts` and are
  handled by `src/controllers/platformSubscription.controller.ts` and
  `src/services/plan.service.ts`.

## 2. What a plan is made of

A plan is three sets of rows:

| Table | Purpose |
| --- | --- |
| `plans` | Identity and presentation: name, slug, description, tagline, CTA, offer, discount badge, features list, status, visibility, featured flag, sort order, trial days |
| `plan_prices` | One row per billing period (`monthly`, `quarterly`, `yearly`, `lifetime`, `custom_days`), stored as integer **paise** with optional strike-through MRP |
| `plan_entitlements` | Registry-defined limits/flags such as `max_quizzes`, `max_rooms`, `ai_credits_per_month`, `remove_branding` |

Supporting behavior:

- The entitlement registry lives in `src/config/entitlementRegistry.ts`.
  Unknown keys are rejected; numbers must be integers (`-1` means unlimited)
  and flags must be booleans.
- Base plan prices are INR. The country overlay can replace the monthly
  Elevate price/currency at read and checkout time without touching
  `plan_prices`.
- Drafts are stored in `plans.draft_payload` (JSONB) plus
  `draft_updated_at`; live columns are untouched until publish.
- Every mutation writes to `subscription_audit_log` with `entity_type = 'plan'`.
  The Plan Editor's **Version history** is built from those audit rows.

## 3. Plan status, visibility, and catalog inclusion

A plan has two independent gates:

1. **Status**: `draft`, `active`, or `archived`.
2. **Visibility**: `is_public` (the **Visible on public pricing** toggle).

The public catalog (`GET /api/v1/pricing`) includes a plan only when **all** of
these are true:

- `status = 'active'`
- `is_public = true` **or** `is_default_free = true`
- The plan has an active `monthly` price row

Consequences:

- Hiding a plan sets its status back to `draft`; it leaves the catalog even if
  `is_public` is still true.
- Setting `is_public = false` leaves the plan active for internal use but hides
  it from the public catalog.
- Deleting a plan's only active monthly price silently removes it from the
  catalog until a monthly price is published again.
- The default-free plan (Essential, `slug = 'free'`) is forced public by the
  service and cannot be hidden, archived, or deleted. `is_default_free` is set
  by seed/migration only; it is not editable in the console.
- Only one plan can be `featured`; saving **Featured** clears the flag on every
  other plan.
- Featured plans are ordered by `sort_order`, then `id`. Drag-and-drop on the
  Plans tab persists the full order through `POST /plans/reorder`.

## 4. Creating a plan

1. Open `/platform/pricing` -> **Plans** -> **New plan**.
2. The console creates a `draft` plan with:
   - a unique name (`Untitled plan`, `Untitled plan 2`, ...),
   - a unique slug,
   - a single active monthly price of `0`,
   - no entitlements, hidden from the public catalog.
3. Edit the fields in the Plan Editor, then **Save draft** or **Publish**.

API: `POST /api/v1/platform/subscriptions/plans`

```json
{
  "name": "Elevate",
  "slug": "pro",
  "prices": [{ "billing_period": "monthly", "amount": 19900, "mrp_amount": 24900 }],
  "entitlements": { "max_quizzes": 100, "max_rooms": 5, "ai_credits_per_month": 100 },
  "status": "draft",
  "is_public": false
}
```

Rules enforced on create:

- Name is required and unique (case-insensitive).
- Slug is generated from the name when omitted; it must be unique.
- At least a valid `prices` array and `entitlements` map are required by the
  schema. The UI sends a zero monthly price and an empty map.
- `trial_days` is `0..365`; `sort_order` is `0..10000`.
- A price amount is a non-negative integer in paise; MRP must be greater than
  or equal to the selling price.

## 5. Editing, drafts, and publishing

The Plan Editor edits a working copy:

- **Save draft** (`PUT /plans/:planId/draft`) only writes
  `draft_payload`/`draft_updated_at`. Nothing public changes.
- **Publish** (`POST /plans/:planId/publish`) applies the saved draft to the
  live tables inside `updatePlan`, activates the plan if it was not active, and
  clears the draft.
- **Publish requires a saved draft**; it returns `NO_DRAFT` otherwise.
- Drafts are private and are never read by the public catalog.
- **Preview** in the console renders the current editor values on the pricing
  preview without saving anything.

`PUT /plans/:planId` (without `/draft`) applies live changes immediately and is
available for API callers; the console uses the draft/publish path.

Concurrency: `PUT /plans/:planId` accepts an optional `expectedUpdatedAt`
timestamp. If the plan changed since it was read, the request fails with
`409 STALE_PLAN`; reload and retry.

### Fields in the Plan Editor

| Group | Fields |
| --- | --- |
| Identity | Plan name, slug, CTA label, tagline, description |
| Marketing | Offer line, discount badge, featured flag, sort order, trial days, visible on public pricing |
| Billing | Monthly (required), quarterly, yearly, lifetime, and custom-day prices; selling price and optional strike-through MRP |
| Features | Ordered checklist shown on plan cards |
| Entitlements | Registry-driven limits and boolean flags, grouped by category |

Notes:

- Monthly pricing is required and always kept active. Other periods are opt-in.
- A custom period needs a positive whole number of days; duplicate billing
  periods (including the same custom day count) are rejected.
- If the discount badge is left blank, the public catalog derives `N% off`
  from the monthly price and MRP (`discountBadge()` in
  `src/services/pricing.service.ts`).
- Trial days configure the card and eligibility; trial requests are reviewed
  separately through the platform trial-request endpoints.
- Entitlements replace the full set on publish: keys omitted from the payload
  are removed. The UI always submits the full visible set.

## 6. Subscriber-safe price and entitlement changes

Pricing changes never rewrite old rows in place:

- A changed price causes the existing `plan_prices` row to be deactivated and a
  new row to be inserted with a new `price_id`.
- Existing subscriptions keep their old `price_id` by default, so they stay on
  the price they bought (grandfathering).
- `migrateSubscribers: true` on `PUT /plans/:planId` repoints existing
  subscriptions to the replacement price ids.
- Prices are never deleted when referenced by a subscription.
- Entitlement changes affect all users on the plan immediately after publish;
  the entitlement cache is invalidated.

Before publishing a price/entitlement change, use
`GET /plans/:planId/impact` to see active/total subscribers and the subscriber
count per price. The Plan Editor shows a warning whenever the selected plan has
active subscribers.

## 7. Lifecycle actions

### Hide / Activate

`POST /plans/:planId/toggle` with `{ "active": boolean }`.

- `active: true` sets status `active`.
- `active: false` sets status `draft` (the "Hide" button).
- Archived plans must be activated first; toggle returns `PLAN_ARCHIVED`.
- The default-free plan cannot be hidden.

### Activate an archived plan

`POST /plans/:planId/activate` restores status to `active`.

### Duplicate

`POST /plans/:planId/duplicate`.

- Creates a `draft` copy named `<name> (copy)` with a unique `-copy` slug.
- Copies active prices and current entitlements; drops gateway price ids.
- The copy is hidden (`is_public = false`) and not featured.
- Use this to stage a redesigned plan before publishing.

### Reorder

`POST /plans/reorder` with `{ "planIds": [...] }`.

- Must contain every plan id exactly once, no unknown ids.
- Drag-and-drop in the console sends the full list.

### Archive

`POST /plans/:planId/archive`.

- Archived plans leave the public catalog; their data and history remain.
- The default-free plan cannot be archived.
- If the plan has active subscribers, a strategy is required:
  - `run_until_expiry`: keep access for current subscribers until their paid
    period ends.
  - `migrate`: move active subscribers to another **active** plan immediately
    (`migrationTargetPlanId`). Migrated subscriptions have `price_id` cleared
    because the target may not share the same price points.
- Without a strategy and with active subscribers, the API returns
  `409 ARCHIVE_STRATEGY_REQUIRED` with the subscriber count.

### Delete

`DELETE /plans/:planId`.

- Only allowed when the plan has no current subscriptions and no
  `plan.migrate_subscribers` audit history.
- Otherwise returns `409 PLAN_HAS_SUBSCRIPTIONS`; archive instead.
- The default-free plan cannot be deleted.
- The console only shows Delete when `subscriber_count = 0`.

### Version history and restore

`GET /plans/:planId/versions` and
`POST /plans/:planId/restore` with `{ "versionId": number }`.

- History comes from `subscription_audit_log` entries for the plan.
- Restore writes the chosen snapshot into the **draft**, not the live plan.
  Review it and publish when ready.

## 8. API reference

All paths are under `/api/v1/platform/subscriptions` and require an owner
platform session.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/plans?search=&status=` | List plans with prices, entitlements, drafts, and subscriber counts |
| `POST` | `/plans` | Create a plan |
| `POST` | `/plans/reorder` | Persist plan order |
| `GET` | `/plans/:planId` | Plan detail |
| `GET` | `/plans/:planId/impact` | Subscriber counts per price and totals |
| `GET` | `/plans/:planId/versions` | Audit-based version history |
| `PUT` | `/plans/:planId` | Update the live plan immediately |
| `PUT` | `/plans/:planId/draft` | Save a private draft |
| `POST` | `/plans/:planId/publish` | Publish the saved draft |
| `POST` | `/plans/:planId/toggle` | Hide (`active: false`) or activate (`active: true`) |
| `POST` | `/plans/:planId/restore` | Restore a version into the draft |
| `POST` | `/plans/:planId/duplicate` | Create a hidden draft copy |
| `POST` | `/plans/:planId/archive` | Archive, optionally migrating subscribers |
| `POST` | `/plans/:planId/activate` | Activate an archived plan |
| `DELETE` | `/plans/:planId` | Delete only when it has no subscription history |

Request validation lives in `src/middleware/subscription.validate.ts`.
Entitlement definitions are served by `GET /api/v1/platform/subscriptions/registry`.

## 9. How the catalog and checkout consume a plan

- The public catalog endpoint (`GET /api/v1/pricing`) reads `plans`,
  `plan_prices`, and `plan_entitlements` directly; drafts are ignored.
- It returns amounts in major units (paise / 100 for INR), includes active
  prices for all billing periods, and auto-computes the discount badge when one
  is not set.
- For Elevate (`slug` `pro` or `elevate`), the resolved country price replaces
  the monthly amount/currency; other plans keep their base INR price. See
  [COUNTRY_WISE_PRICING.md](./COUNTRY_WISE_PRICING.md).
- Checkout re-reads the active catalog price, not the draft. Only monthly plan
  purchases are supported; the order snapshots the plan, price, currency, and
  country-pricing version at purchase time.
- Existing subscriptions are not changed by editing or publishing a plan unless
  a migration is explicitly selected.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Plan missing from `/pricing` and creator billing | Status is `draft`/`archived`, `is_public` is false, or it has no active monthly price | Activate the plan, enable **Visible on public pricing**, and add an active monthly price |
| Plan visible in admin but missing only on the creator page | Country override resolved to `0` for Elevate; the creator page filters out `price > 0` unless it is the current plan | Fix the country price in the Countries tab; see the country-pricing doc |
| Hide button does not remove the plan | The save failed, or the plan is the default-free plan | Check the toast/API error; default-free cannot be hidden |
| Cannot archive | There are active subscribers and no strategy chosen | Choose run-until-expiry or migrate to an active plan |
| Cannot delete | Current subscriptions or migration history exist | Archive the plan instead |
| Price change did not affect current subscribers | Price changes are grandfathered by default | Use `migrateSubscribers` or archive with the migrate strategy after reviewing impact |
| `STALE_PLAN` on save | Someone else changed the plan after you loaded it | Reload the console and reapply the edit |
| Publish returns `NO_DRAFT` | Nothing was saved as a draft | Click **Save draft**, then **Publish** |
| New entitlement key is rejected | The key is not registered | Add it to `src/config/entitlementRegistry.ts` and deploy |
| Duplicate name/slug error | Names and slugs must be unique | Pick another name/slug; slugs are generated with a numeric suffix when omitted |
| Discount badge is empty or stale | Badge is derived from live monthly amount and MRP | Set a manual badge or update the monthly price/MRP |

## 11. File map

Backend:

- `src/routes/v1/platformSubscriptions.routes.ts` - plan/price/country/pack
  routes.
- `src/middleware/subscription.validate.ts` - request schemas.
- `src/controllers/platformSubscription.controller.ts` - HTTP handlers.
- `src/services/plan.service.ts` - lifecycle rules, drafts, publishing,
  archiving, deletion, restore, reorder, auditing.
- `src/repositories/plan.repository.ts` - catalog queries, price replacement and
  grandfathering, draft storage, subscriber migration.
- `src/config/entitlementRegistry.ts` - entitlement definitions and defaults.
- `src/services/pricing.service.ts` - public catalog and discount badge.
- `src/services/subscriptionAudit.service.ts` - `subscription_audit_log`
  writes used by version history.

Frontend:

- `src/components/platform/pricing/PricingAdmin.tsx` - console shell, plan
  cards, drag ordering, hide/activate, create.
- `src/components/platform/pricing/PlanEditor.tsx` - fields, billing periods,
  features, entitlements, draft/publish, duplicate, archive, delete, versions.
- `src/components/platform/pricing/PricingPreview.tsx` - live preview.
- `src/components/platform/pricing/admin-ui.tsx` - shared controls.
- `src/services/platform.ts` - platform API client and plan types.
