// Database access for checkout, subscription activation and the credit ledger.

import type { Pool, PoolClient } from "pg";
import { pool } from "../config/database.ts";
import type { BillingPeriod } from "../services/billing/calculations.ts";

type Db = Pool | PoolClient;

export type OrderType = "plan" | "credit_pack";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type CouponType = "percent" | "flat" | "free_days";

export interface PurchasablePlan {
  planId: number;
  slug: string;
  name: string;
  description: string | null;
  trialDays: number;
  isDefaultFree: boolean;
  priceId: number;
  billingPeriod: BillingPeriod;
  customDays: number | null;
  amountPaise: number;
  mrpAmountPaise: number | null;
  currency: string;
  taxInclusive: boolean;
  credits: number;
}

export interface PurchasableCreditPack {
  id: number;
  code: string;
  name: string;
  priceInr: number;
  credits: number;
  validityDays: number;
  description: string | null;
  isPopular: boolean;
}

export interface CouponRow {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  appliesToPlanIds: number[] | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  validFrom: Date | null;
  validUntil: Date | null;
  status: string;
}

export interface CouponUsage {
  total: number;
  perUser: number;
}

export interface OrderRow {
  id: string;
  orderNo: string;
  userId: string;
  orderType: OrderType;
  planId: number | null;
  catalogPlanId: number | null;
  catalogPriceId: number | null;
  packId: number | null;
  amountPaise: number;
  mrpPaise: number;
  discountPaise: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string | null;
  gateway: string | null;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  paidAt: Date | null;
  validityDays: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  creditsTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  isActive: boolean;
  couponId: number | null;
  couponCode: string | null;
  subscriptionId: number | null;
  refundAmountPaise: number;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderListRow extends OrderRow {
  planSlug: string | null;
  planName: string | null;
  packCode: string | null;
  packName: string | null;
}

export interface ExistingSubscription {
  id: number;
  planId: number;
  planSlug: string;
  planName: string;
  isDefaultFree: boolean;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
}

export interface CreditBalanceSummary {
  total: number;
  planCredits: number;
  purchasedCredits: number;
  nearestExpiry: Date | null;
}

/**
 * Converts PostgreSQL numeric values to numbers with a fallback. Counts and money arrive as strings in some driver paths, so every mapping goes through here.
 */
function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalizes a PostgreSQL timestamp value into a Date. Invalid input returns null so callers can distinguish missing timestamps.
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Maps a raw orders row into the camelCase shape used by the service. Money stays in paise and bigint identifiers become strings for safe transport.
 */
function mapOrder(row: Record<string, unknown>): OrderRow {
  return {
    id: String(row.id),
    orderNo: String(row.order_no),
    userId: String(row.user_id),
    orderType: row.order_type as OrderType,
    planId: row.plan_id == null ? null : toNumber(row.plan_id),
    catalogPlanId:
      row.catalog_plan_id == null ? null : toNumber(row.catalog_plan_id),
    catalogPriceId:
      row.catalog_price_id == null ? null : toNumber(row.catalog_price_id),
    packId: row.pack_id == null ? null : toNumber(row.pack_id),
    amountPaise: toNumber(row.amount_inr),
    mrpPaise: toNumber(row.mrp_inr),
    discountPaise: toNumber(row.discount_inr),
    currency: String(row.currency ?? "INR"),
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method == null ? null : String(row.payment_method),
    gateway: row.gateway == null ? null : String(row.gateway),
    gatewayOrderId:
      row.gateway_order_id == null ? null : String(row.gateway_order_id),
    gatewayPaymentId:
      row.gateway_payment_id == null ? null : String(row.gateway_payment_id),
    paidAt: toDate(row.paid_at),
    validityDays: toNumber(row.validity_days),
    startsAt: toDate(row.starts_at),
    expiresAt: toDate(row.expires_at),
    creditsTotal: toNumber(row.credits_total),
    creditsUsed: toNumber(row.credits_used),
    creditsRemaining: toNumber(row.credits_remaining),
    isActive: row.is_active === true,
    couponId: row.coupon_id == null ? null : toNumber(row.coupon_id),
    couponCode: row.coupon_code == null ? null : String(row.coupon_code),
    subscriptionId:
      row.subscription_id == null ? null : toNumber(row.subscription_id),
    refundAmountPaise: toNumber(row.refund_amount),
    failureReason: row.failure_reason == null ? null : String(row.failure_reason),
    createdAt: toDate(row.created_at) ?? new Date(0),
    updatedAt: toDate(row.updated_at) ?? new Date(0),
  };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * Loads an active, public, non-free plan with its latest monthly price and AI-credit entitlement. The query accepts either a numeric id or a slug and never returns draft or archived plans.
 */
export async function findPurchasablePlan(
  input: { planId?: number | null; planSlug?: string | null },
  db: Db = pool
): Promise<PurchasablePlan | null> {
  const result = await db.query(
    `SELECT p.id AS plan_id, p.slug, p.name, p.description, p.trial_days,
            p.is_default_free,
            pp.id AS price_id, pp.billing_period, pp.custom_days, pp.amount,
            pp.mrp_amount, pp.currency, pp.tax_inclusive,
            COALESCE((
              SELECT CASE
                       WHEN jsonb_typeof(pe.value) = 'number'
                         THEN (pe.value #>> '{}')::int
                       WHEN pe.value = 'true'::jsonb THEN -1
                       ELSE 0
                     END
              FROM plan_entitlements pe
              WHERE pe.plan_id = p.id
                AND pe.key = 'ai_credits_per_month'
            ), 0)::int AS credits
     FROM plans p
     JOIN LATERAL (
       SELECT id, billing_period, custom_days, amount, mrp_amount, currency,
              tax_inclusive
       FROM plan_prices
       WHERE plan_id = p.id
         AND billing_period = 'monthly'
         AND is_active = TRUE
       ORDER BY id DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE p.status = 'active'
       AND p.is_public = TRUE
       AND p.is_default_free = FALSE
       AND ($1::int IS NULL OR p.id = $1)
       AND ($2::text IS NULL OR p.slug = $2)
     ORDER BY p.id ASC
     LIMIT 1`,
    [input.planId ?? null, input.planSlug ?? null]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    planId: toNumber(row.plan_id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    trialDays: toNumber(row.trial_days),
    isDefaultFree: row.is_default_free === true,
    priceId: toNumber(row.price_id),
    billingPeriod: row.billing_period as BillingPeriod,
    customDays: row.custom_days == null ? null : toNumber(row.custom_days),
    amountPaise: toNumber(row.amount),
    mrpAmountPaise: row.mrp_amount == null ? null : toNumber(row.mrp_amount),
    currency: String(row.currency ?? "INR"),
    taxInclusive: row.tax_inclusive === true,
    credits: toNumber(row.credits),
  };
}

/**
 * Finds an active credit pack by numeric id or code. The result contains the server-owned price, credits, and validity that checkout must use.
 */
export async function findPurchasableCreditPack(
  packKey: string,
  db: Db = pool
): Promise<PurchasableCreditPack | null> {
  const result = await db.query(
    `SELECT id, code, name, price_inr, credits, validity_days, description,
            is_popular
     FROM ai_credit_packs
     WHERE is_active = TRUE
       AND (code = $1 OR id::text = $1)
     LIMIT 1`,
    [packKey]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: toNumber(row.id),
    code: String(row.code),
    name: String(row.name),
    priceInr: toNumber(row.price_inr),
    credits: toNumber(row.credits),
    validityDays: toNumber(row.validity_days, 180),
    description: row.description == null ? null : String(row.description),
    isPopular: row.is_popular === true,
  };
}

/**
 * Loads a credit pack by primary key even if it has since been deactivated. Verification needs this to return the original pack code for an already-paid order.
 */
export async function findCreditPackById(
  packId: number,
  db: Db = pool
): Promise<PurchasableCreditPack | null> {
  const result = await db.query(
    `SELECT id, code, name, price_inr, credits, validity_days, description,
            is_popular
     FROM ai_credit_packs
     WHERE id = $1
     LIMIT 1`,
    [packId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: toNumber(row.id),
    code: String(row.code),
    name: String(row.name),
    priceInr: toNumber(row.price_inr),
    credits: toNumber(row.credits),
    validityDays: toNumber(row.validity_days, 180),
    description: row.description == null ? null : String(row.description),
    isPopular: row.is_popular === true,
  };
}

/**
 * Returns the basic identity of a plan for responses and audit records. It deliberately ignores status so historical orders can still describe their plan.
 */
export async function findPlanSummaryById(
  planId: number,
  db: Db = pool
): Promise<{ id: number; slug: string; name: string } | null> {
  const result = await db.query(
    `SELECT id, slug, name FROM plans WHERE id = $1 LIMIT 1`,
    [planId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: toNumber(row.id),
    slug: String(row.slug),
    name: String(row.name),
  };
}

/**
 * Maps a public plan slug to the legacy monthly_plans row used by older order code. A missing match returns null and the order still works through the new catalog.
 */
export async function findLegacyMonthlyPlanId(
  code: string,
  db: Db = pool
): Promise<number | null> {
  const result = await db.query(
    `SELECT id FROM monthly_plans WHERE code = $1 AND is_active = TRUE LIMIT 1`,
    [code]
  );
  const row = result.rows[0];
  return row ? toNumber(row.id) : null;
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/**
 * Locks and loads a coupon by case-insensitive code inside the caller's transaction. The row lock serializes redemption checks for concurrent checkouts.
 */
export async function lockCouponByCode(
  code: string,
  db: Db
): Promise<CouponRow | null> {
  const result = await db.query(
    `SELECT id, code, type, value, applies_to_plan_ids, max_redemptions,
            per_user_limit, valid_from, valid_until, status
     FROM coupons
     WHERE LOWER(code) = LOWER($1)
     FOR UPDATE`,
    [code]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: toNumber(row.id),
    code: String(row.code),
    type: row.type as CouponType,
    value: toNumber(row.value),
    appliesToPlanIds: Array.isArray(row.applies_to_plan_ids)
      ? (row.applies_to_plan_ids as unknown[]).map((value) => toNumber(value))
      : null,
    maxRedemptions:
      row.max_redemptions == null ? null : toNumber(row.max_redemptions),
    perUserLimit: toNumber(row.per_user_limit, 1),
    validFrom: toDate(row.valid_from),
    validUntil: toDate(row.valid_until),
    status: String(row.status),
  };
}

/**
 * Counts total and per-user redemptions for a coupon. The counts enforce global and per-user limits while the coupon row is locked.
 */
export async function getCouponUsage(
  couponId: number,
  userId: string,
  db: Db
): Promise<CouponUsage> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE user_id::text = $2)::int AS per_user
     FROM coupon_redemptions
     WHERE coupon_id = $1`,
    [couponId, userId]
  );
  return {
    total: toNumber(result.rows[0]?.total),
    perUser: toNumber(result.rows[0]?.per_user),
  };
}

/**
 * Records a coupon redemption against a pending order. The unique order link lets abandoned or failed checkouts release the reservation exactly once.
 */
export async function reserveCoupon(
  input: { couponId: number; userId: string; orderId: string },
  db: Db
): Promise<void> {
  await db.query(
    `INSERT INTO coupon_redemptions (coupon_id, user_id, order_id)
     VALUES ($1, $2, $3)`,
    [input.couponId, input.userId, input.orderId]
  );
}

/**
 * Deletes the redemption reserved by a pending order. Failed payments and failed gateway starts call this so the coupon can be used again.
 */
export async function releaseCouponReservation(
  orderId: string,
  db: Db
): Promise<void> {
  await db.query(`DELETE FROM coupon_redemptions WHERE order_id = $1`, [orderId]);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const ORDER_COLUMNS = `o.id, o.order_no, o.user_id, o.order_type, o.plan_id,
  o.catalog_plan_id, o.catalog_price_id, o.pack_id, o.amount_inr, o.mrp_inr, o.discount_inr,
  o.currency, o.status, o.payment_method, o.gateway, o.gateway_order_id,
  o.gateway_payment_id, o.paid_at, o.validity_days, o.starts_at, o.expires_at,
  o.credits_total, o.credits_used, o.credits_remaining, o.is_active,
  o.coupon_id, o.coupon_code, o.subscription_id, o.refund_amount,
  o.failure_reason, o.created_at, o.updated_at`;

/**
 * Finds an existing unpaid checkout for the same user, item, and coupon. Reusing its Razorpay order prevents double-clicks from creating duplicate charges.
 */
export async function findReusablePendingOrder(
  input: {
    userId: string;
    orderType: OrderType;
    catalogPlanId: number | null;
    packId: number | null;
    couponCode: string | null;
  },
  db: Db = pool
): Promise<OrderRow | null> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS}
     FROM orders o
     WHERE o.user_id = $1
       AND o.order_type = $2
       AND o.status = 'pending'
       AND o.gateway_order_id IS NOT NULL
       AND o.catalog_plan_id IS NOT DISTINCT FROM $3::int
       AND o.pack_id IS NOT DISTINCT FROM $4::int
       AND LOWER(COALESCE(o.coupon_code, '')) = LOWER(COALESCE($5, ''))
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [
      input.userId,
      input.orderType,
      input.catalogPlanId,
      input.packId,
      input.couponCode,
    ]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Loads one order by numeric id or order number while scoping it to the authenticated user. Ownership is enforced in SQL, not in the controller.
 */
export async function findOrderForUser(
  userId: string,
  orderKey: string,
  db: Db = pool
): Promise<OrderRow | null> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS}
     FROM orders o
     WHERE o.user_id = $1
       AND (o.id::text = $2 OR o.order_no = $2)
     LIMIT 1`,
    [userId, orderKey]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Locks one order row for the rest of the transaction. Payment completion and refunds use this to make concurrent callbacks idempotent.
 */
export async function findOrderByIdForUpdate(
  orderId: string,
  db: Db
): Promise<OrderRow | null> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.id = $1 FOR UPDATE`,
    [orderId]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Looks up a local order by its Razorpay order id. Webhooks use this mapping to apply gateway events to the correct purchase.
 */
export async function findOrderByGatewayOrderId(
  gatewayOrderId: string,
  db: Db = pool
): Promise<OrderRow | null> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS}
     FROM orders o
     WHERE o.gateway = 'razorpay' AND o.gateway_order_id = $1
     LIMIT 1`,
    [gatewayOrderId]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Looks up a local order by its Razorpay payment id. Refund webhooks use this because they reference the payment rather than the order.
 */
export async function findOrderByGatewayPaymentId(
  gatewayPaymentId: string,
  db: Db = pool
): Promise<OrderRow | null> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS}
     FROM orders o
     WHERE o.gateway = 'razorpay' AND o.gateway_payment_id = $1
     LIMIT 1`,
    [gatewayPaymentId]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

export interface InsertOrderInput {
  orderNo: string;
  userId: string;
  orderType: OrderType;
  planId: number | null;
  catalogPlanId: number | null;
  catalogPriceId: number | null;
  packId: number | null;
  amountPaise: number;
  mrpPaise: number;
  discountPaise: number;
  currency: string;
  validityDays: number;
  creditsTotal: number;
  couponId: number | null;
  couponCode: string | null;
  notes: string | null;
}

/**
 * Inserts a pending order with server-computed prices and snapshot credits. The caller supplies the transaction so coupon reservation and insertion commit together.
 */
export async function insertOrder(
  input: InsertOrderInput,
  db: Db
): Promise<OrderRow> {
  const result = await db.query(
    `INSERT INTO orders
       (order_no, user_id, order_type, plan_id, catalog_plan_id,
        catalog_price_id, pack_id, amount_inr, mrp_inr, discount_inr, currency,
        status, gateway, validity_days, credits_total, coupon_id, coupon_code,
        notes)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'razorpay',
        $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      input.orderNo,
      input.userId,
      input.orderType,
      input.planId,
      input.catalogPlanId,
      input.catalogPriceId,
      input.packId,
      input.amountPaise,
      input.mrpPaise,
      input.discountPaise,
      input.currency,
      input.validityDays,
      input.creditsTotal,
      input.couponId,
      input.couponCode,
      input.notes,
    ]
  );
  return mapOrder(result.rows[0]);
}

/**
 * Stores the Razorpay order id and raw gateway payload after checkout creation. A unique index keeps one gateway order from being attached twice.
 */
export async function attachGatewayOrder(
  input: {
    orderId: string;
    gatewayOrderId: string;
    payload: unknown;
  },
  db: Db
): Promise<OrderRow> {
  const result = await db.query(
    `UPDATE orders
     SET gateway_order_id = $2, gateway_payload = $3::jsonb
     WHERE id = $1
     RETURNING *`,
    [input.orderId, input.gatewayOrderId, JSON.stringify(input.payload)]
  );
  return mapOrder(result.rows[0]);
}

/**
 * Marks a still-pending order as failed and records the gateway reason. The status guard prevents a late failure event from overwriting a successful payment.
 */
export async function markOrderFailed(
  input: { orderId: string; reason: string },
  db: Db
): Promise<OrderRow | null> {
  const result = await db.query(
    `UPDATE orders
     SET status = 'failed', failure_reason = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [input.orderId, input.reason.slice(0, 2000)]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Moves an order to paid and stores its payment, validity window, credits, and subscription link. The update runs under the order lock taken by the service.
 */
export async function completeOrderPaid(
  input: {
    orderId: string;
    gatewayPaymentId: string | null;
    paymentMethod: string | null;
    gatewaySignature: string | null;
    gatewayPayload: unknown;
    startsAt: Date;
    expiresAt: Date;
    creditsTotal: number;
    validityDays: number;
    subscriptionId: number | null;
  },
  db: Db
): Promise<OrderRow> {
  const result = await db.query(
    `UPDATE orders
     SET status = 'paid',
         gateway_payment_id = COALESCE($2, gateway_payment_id),
         payment_method = COALESCE($3, payment_method),
         gateway_signature = COALESCE($4, gateway_signature),
         gateway_payload = COALESCE($5::jsonb, gateway_payload),
         paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
         starts_at = $6,
         expires_at = $7,
         credits_total = $8,
         validity_days = $9,
         subscription_id = COALESCE($10, subscription_id),
         is_active = TRUE,
         failure_reason = NULL
     WHERE id = $1
     RETURNING *`,
    [
      input.orderId,
      input.gatewayPaymentId,
      input.paymentMethod,
      input.gatewaySignature,
      input.gatewayPayload == null ? null : JSON.stringify(input.gatewayPayload),
      input.startsAt,
      input.expiresAt,
      input.creditsTotal,
      input.validityDays,
      input.subscriptionId,
    ]
  );
  return mapOrder(result.rows[0]);
}

/**
 * Marks a paid order as refunded, deactivates its credits, and records the refunded amount. It only touches rows that are still paid.
 */
export async function refundOrder(
  input: { orderId: string; refundAmountPaise: number; reason: string | null },
  db: Db
): Promise<OrderRow | null> {
  const result = await db.query(
    `UPDATE orders
     SET status = 'refunded',
         is_active = FALSE,
         refunded_at = CURRENT_TIMESTAMP,
         refund_amount = $2,
         failure_reason = COALESCE($3, failure_reason)
     WHERE id = $1 AND status = 'paid'
     RETURNING *`,
    [input.orderId, input.refundAmountPaise, input.reason]
  );
  const row = result.rows[0];
  return row ? mapOrder(row) : null;
}

/**
 * Accumulates a partial refund without deactivating the order. Full refunds are handled separately once the cumulative amount covers the purchase.
 */
export async function recordPartialRefund(
  input: { orderId: string; refundAmountPaise: number; reason: string | null },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE orders
     SET refund_amount = refund_amount + $2,
         failure_reason = COALESCE($3, failure_reason)
     WHERE id = $1 AND status = 'paid'`,
    [input.orderId, input.refundAmountPaise, input.reason]
  );
}

/**
 * Returns the user's order history with plan and pack display names. The limit is bounded by the controller before this query runs.
 */
export async function listUserOrders(
  userId: string,
  limit: number,
  db: Db = pool
): Promise<OrderListRow[]> {
  const result = await db.query(
    `SELECT ${ORDER_COLUMNS},
            p.slug AS plan_slug, p.name AS plan_name,
            cp.code AS pack_code, cp.name AS pack_name
     FROM orders o
     LEFT JOIN plans p ON p.id = o.catalog_plan_id
     LEFT JOIN ai_credit_packs cp ON cp.id = o.pack_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    ...mapOrder(row),
    planSlug: row.plan_slug == null ? null : String(row.plan_slug),
    planName: row.plan_name == null ? null : String(row.plan_name),
    packCode: row.pack_code == null ? null : String(row.pack_code),
    packName: row.pack_name == null ? null : String(row.pack_name),
  }));
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Locks the user's current active, trialing, or past-due subscription. Paid plans take precedence over the default free subscription.
 */
export async function findActiveSubscriptionForUpdate(
  userId: string,
  db: Db
): Promise<ExistingSubscription | null> {
  const result = await db.query(
    `SELECT s.id, s.plan_id, s.status, s.current_period_start,
            s.current_period_end, s.trial_end,
            p.slug AS plan_slug, p.name AS plan_name,
            p.is_default_free AS plan_is_default_free
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
       AND s.status IN ('trialing', 'active', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
     ORDER BY p.is_default_free ASC, s.started_at DESC, s.id DESC
     LIMIT 1
     FOR UPDATE OF s`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: toNumber(row.id),
    planId: toNumber(row.plan_id),
    planSlug: String(row.plan_slug),
    planName: String(row.plan_name),
    isDefaultFree: row.plan_is_default_free === true,
    status: String(row.status),
    currentPeriodStart: toDate(row.current_period_start),
    currentPeriodEnd: toDate(row.current_period_end),
    trialEnd: toDate(row.trial_end),
  };
}

/**
 * Extends or converts the current subscription and clears trial and cancellation fields. The new price and period are written atomically with the order.
 */
export async function updateSubscriptionPeriod(
  input: {
    subscriptionId: number;
    priceId: number;
    periodStart: Date;
    periodEnd: Date;
  },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE subscriptions
     SET status = 'active',
         price_id = $2,
         current_period_start = $3,
         current_period_end = $4,
         trial_end = NULL,
         cancel_at_period_end = FALSE,
         canceled_at = NULL,
         cancel_reason = NULL,
         source = 'self_serve'
     WHERE id = $1`,
    [
      input.subscriptionId,
      input.priceId,
      input.periodStart,
      input.periodEnd,
    ]
  );
}

/**
 * Cancels a subscription immediately, recording the reason. Plan switches call this before inserting the replacement subscription.
 */
export async function cancelSubscription(
  input: { subscriptionId: number; reason: string },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE subscriptions
     SET status = 'canceled',
         canceled_at = CURRENT_TIMESTAMP,
         cancel_at_period_end = FALSE,
         cancel_reason = $2
     WHERE id = $1`,
    [input.subscriptionId, input.reason]
  );
}

/**
 * Creates a new active subscription for a verified plan purchase. The order links back to this row for future renewals and refunds.
 */
export async function insertSubscription(
  input: {
    userId: string;
    planId: number;
    priceId: number;
    periodStart: Date;
    periodEnd: Date;
    notes: string | null;
  },
  db: Db
): Promise<number> {
  const result = await db.query(
    `INSERT INTO subscriptions
       (user_id, plan_id, price_id, status, started_at, current_period_start,
        current_period_end, source, notes)
     VALUES ($1, $2, $3, 'active', $4, $4, $5, 'self_serve', $6)
     RETURNING id`,
    [
      input.userId,
      input.planId,
      input.priceId,
      input.periodStart,
      input.periodEnd,
      input.notes,
    ]
  );
  return toNumber(result.rows[0]?.id);
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

/**
 * Sums unexpired, active credits grouped into plan and purchased buckets. Only orders that have started and not expired contribute to the balance.
 */
export async function getCreditBalance(
  userId: string,
  db: Db = pool
): Promise<CreditBalanceSummary> {
  const result = await db.query(
    `SELECT COALESCE(SUM(credits_remaining), 0)::int AS total,
            COALESCE(SUM(credits_remaining) FILTER (WHERE order_type = 'plan'), 0)::int AS plan_credits,
            COALESCE(SUM(credits_remaining) FILTER (WHERE order_type = 'credit_pack'), 0)::int AS purchased_credits,
            MIN(expires_at) AS nearest_expiry
     FROM orders
     WHERE user_id = $1
       AND status = 'paid'
       AND is_active = TRUE
       AND credits_total > 0
       AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
    [userId]
  );

  const row = result.rows[0] ?? {};
  return {
    total: toNumber(row.total),
    planCredits: toNumber(row.plan_credits),
    purchasedCredits: toNumber(row.purchased_credits),
    nearestExpiry: toDate(row.nearest_expiry),
  };
}

/**
 * Appends a positive grant or negative refund adjustment to the credit ledger. Zero-amount entries are skipped because the schema forbids them.
 */
export async function insertCreditTransaction(
  input: {
    userId: string;
    orderId: string | null;
    amount: number;
    reason: string;
    refId: string | null;
    balanceAfter: number;
  },
  db: Db
): Promise<void> {
  if (input.amount === 0) return;
  await db.query(
    `INSERT INTO credit_transactions
       (user_id, order_id, amount, reason, ref_id, balance_after)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      input.orderId,
      input.amount,
      input.reason,
      input.refId,
      input.balanceAfter,
    ]
  );
}

// ---------------------------------------------------------------------------
// Webhook idempotency
// ---------------------------------------------------------------------------

/**
 * Atomically records a webhook event id, returning false when it was already handled. This is the primary defense against Razorpay retries double-granting credits.
 */
export async function recordGatewayEvent(
  input: { eventId: string; eventType: string; payload: unknown },
  db: Db
): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO gateway_events (gateway, event_id, event_type, payload)
     VALUES ('razorpay', $1, $2, $3::jsonb)
     ON CONFLICT (gateway, event_id) DO NOTHING
     RETURNING id`,
    [input.eventId, input.eventType, JSON.stringify(input.payload)]
  );
  return result.rows.length > 0;
}

/**
 * Marks a stored webhook event as processed after its business action commits. Failed transactions roll back both the event and the action together.
 */
export async function markGatewayEventProcessed(
  eventId: string,
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE gateway_events
     SET processed_at = CURRENT_TIMESTAMP
     WHERE gateway = 'razorpay' AND event_id = $1`,
    [eventId]
  );
}
