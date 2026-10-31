// Checkout, verification, subscription activation and webhook processing for
// Razorpay plan and AI-credit-pack purchases.

import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  getRazorpayConfig,
  getRazorpayWebhookSecret,
} from "../config/razorpay.ts";
import { pool } from "../config/database.ts";
import * as billingRepository from "../repositories/billing.repository.ts";
import type {
  CouponRow,
  CreditBalanceSummary,
  OrderRow,
  OrderType,
  PurchasableCreditPack,
  PurchasablePlan,
  PurchasablePlanBundle,
} from "../repositories/billing.repository.ts";
import {
  addDays,
  computeCouponDiscount,
  computeSubscriptionPlacement,
  couponAppliesToPlan,
  MIN_RAZORPAY_AMOUNT_PAISE,
  orderNumber,
  validityDaysForPeriod,
} from "./billing/calculations.ts";
import { BillingError } from "./billing/errors.ts";
import {
  gatewayErrorMessage,
  RazorpayClient,
  RazorpayGatewayError,
} from "./billing/razorpay.client.ts";
import {
  buildPackUpgradeSuggestion,
  buildPlanBundleSuggestion,
  type CheckoutSuggestion,
} from "./billing/suggestions.ts";
import type {
  RazorpayPayment,
  RazorpayRefund,
} from "./billing/razorpay.client.ts";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./billing/signatures.ts";
import { invalidateEntitlements } from "./entitlement.service.ts";
import { writeSubscriptionAudit } from "./subscriptionAudit.service.ts";
import * as invoiceService from "./invoice.service.ts";

const BILLING_LOCK_NAMESPACE = 72_831;
const ACTIVE_ORDER_STATUSES = new Set(["pending", "failed"]);

/**
 * Requires the Razorpay key pair for checkout or verification. Missing keys are a server configuration problem, so this throws a typed 503 instead of a generic error that would become a 500.
 */
function requireGatewayConfig() {
  const config = getRazorpayConfig();
  if (!config) {
    throw new BillingError(
      503,
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  return config;
}

export interface CreditOrderResponse {
  orderId: string;
  orderNo: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  packId: string;
  credits: number;
  validityDays: number;
  keyId: string;
}

export interface PlanOrderResponse {
  orderId: string;
  orderNo: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  planId: number;
  planSlug: string;
  planName: string;
  credits: number;
  validityDays: number;
  keyId: string;
}

export interface BundleOrderResponse {
  orderId: string;
  orderNo: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  bundleId: number;
  planId: number;
  planSlug: string;
  planName: string;
  planCredits: number;
  packId: number;
  packCode: string;
  packName: string;
  packCredits: number;
  packValidityDays: number;
  credits: number;
  validityDays: number;
  keyId: string;
}

export interface VerifiedBundlePurchase {
  transactionId: string;
  orderId: string;
  bundleId: number | null;
  planId: number | null;
  planSlug: string | null;
  planName: string | null;
  packId: number | null;
  packCode: string | null;
  packName: string | null;
  planCredits: number;
  packCredits: number;
  credits: number;
  validityDays: number;
  packValidityDays: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  packExpiresAt: string | null;
  subscriptionId: number | null;
  newBalance: number;
  currency: string;
  amountPaise: number;
}

export interface CheckoutSuggestionResponse {
  suggestion: CheckoutSuggestion | null;
  planCode: string | null;
}

export interface VerifyCreditOrderInput {
  orderKey: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifiedCreditResponse {
  transactionId: string;
  orderId: string;
  packId: string;
  credits: number;
  newBalance: number;
}

export interface VerifiedPlanResponse {
  transactionId: string;
  orderId: string;
  planId: number | null;
  planSlug: string | null;
  planName: string | null;
  credits: number;
  validityDays: number;
  startsAt: string | null;
  expiresAt: string | null;
  subscriptionId: number | null;
  newBalance: number;
  currency: string;
  amountPaise: number;
}

export interface WebhookResult {
  duplicate: boolean;
  eventType: string;
}

interface CouponResolution {
  coupon: CouponRow;
  discountPaise: number;
  bonusDays: number;
}

interface CompletedOrder {
  order: OrderRow;
  plan: { id: number; slug: string; name: string } | null;
  subscriptionId: number | null;
  balance: CreditBalanceSummary;
  /** True only for the transaction that moved the order into "paid". */
  newlyPaid: boolean;
}

/**
 * Runs a callback inside a PostgreSQL transaction and always releases the client. Errors roll back before being rethrown so partial billing writes never commit.
 */
function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  })();
}

/**
 * Serializes billing mutations for one user with a transaction-scoped advisory lock. It shares the entitlement lock namespace so purchases and AI-credit debits cannot race.
 */
async function lockBillingUser(client: PoolClient, userId: string): Promise<void> {
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId)) return;
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
    BILLING_LOCK_NAMESPACE,
    Math.trunc(numericUserId),
  ]);
}

/**
 * Trims an optional coupon code and converts blanks to null. Validation still handles an empty submitted string.
 */
function normalizeCouponCode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

/**
 * Checks a PostgreSQL error for a specific unique constraint name. Checkout uses it to turn a duplicate pending order into a clean conflict response.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  const pgError = error as { code?: string; constraint?: string } | null;
  return pgError?.code === "23505" && pgError.constraint === constraint;
}

/**
 * Validates an optional client currency against the catalog currency. Amounts are never converted, so a mismatch is rejected.
 */
function resolveCurrency(catalogCurrency: string, requested?: string | null): string {
  const currency = (catalogCurrency || "INR").toUpperCase();
  if (requested && requested.trim().toUpperCase() !== currency) {
    throw new BillingError(
      400,
      "UNSUPPORTED_CURRENCY",
      `This purchase is priced in ${currency}.`
    );
  }
  return currency;
}

/**
 * Rejects non-finite or sub-minimum Razorpay amounts. The gateway cannot create an order below one rupee.
 */
function requireAmount(amountPaise: number): void {
  if (!Number.isFinite(amountPaise) || amountPaise < MIN_RAZORPAY_AMOUNT_PAISE) {
    throw new BillingError(
      400,
      "AMOUNT_TOO_LOW",
      "The payable amount is below the payment gateway minimum of ₹1."
    );
  }
}

/**
 * Builds the Razorpay notes that identify a plan checkout. The local order id and plan identifiers make reconciliation possible from the dashboard.
 */
function planOrderNotes(plan: PurchasablePlan, orderId: string): Record<string, string> {
  return {
    local_order_id: orderId,
    order_type: "plan",
    plan_id: String(plan.planId),
    plan_slug: plan.slug,
  };
}

/**
 * Builds the Razorpay notes that identify a credit-pack checkout. They include both the numeric pack id and the public pack code.
 */
function packOrderNotes(pack: PurchasableCreditPack, orderId: string): Record<string, string> {
  return {
    local_order_id: orderId,
    order_type: "credit_pack",
    pack_id: String(pack.id),
    pack_code: pack.code,
  };
}

/**
 * Builds Razorpay notes for a bundle checkout. Both catalog ids are included
 * so support can reconcile a combined purchase from the gateway dashboard.
 */
function bundleOrderNotes(
  bundle: PurchasablePlanBundle,
  orderId: string
): Record<string, string> {
  return {
    local_order_id: orderId,
    order_type: "bundle",
    bundle_id: String(bundle.id),
    plan_id: String(bundle.planId),
    plan_slug: bundle.plan.slug,
    pack_id: String(bundle.packId),
    pack_code: bundle.pack.code,
  };
}

/**
 * Locks and validates a coupon for this user and item, then computes its discount and bonus days. Limits, validity windows, and plan allowlists are enforced before the order exists.
 */
async function resolveCouponForCheckout(
  client: PoolClient,
  input: {
    code: string;
    userId: string;
    planId: number | null;
    amountPaise: number;
  }
): Promise<CouponResolution> {
  const coupon = await billingRepository.lockCouponByCode(input.code, client);
  if (!coupon) {
    throw new BillingError(400, "COUPON_INVALID", "This coupon code is invalid.");
  }
  if (coupon.status !== "active") {
    throw new BillingError(400, "COUPON_INVALID", "This coupon is no longer available.");
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) {
    throw new BillingError(400, "COUPON_NOT_STARTED", "This coupon is not active yet.");
  }
  if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) {
    throw new BillingError(400, "COUPON_EXPIRED", "This coupon has expired.");
  }
  if (!couponAppliesToPlan(coupon.appliesToPlanIds, input.planId)) {
    throw new BillingError(
      400,
      "COUPON_NOT_APPLICABLE",
      "This coupon does not apply to the selected item."
    );
  }

  const usage = await billingRepository.getCouponUsage(coupon.id, input.userId, client);
  if (coupon.maxRedemptions !== null && usage.total >= coupon.maxRedemptions) {
    throw new BillingError(400, "COUPON_EXHAUSTED", "This coupon has reached its limit.");
  }
  if (coupon.perUserLimit > 0 && usage.perUser >= coupon.perUserLimit) {
    throw new BillingError(400, "COUPON_ALREADY_USED", "You have already used this coupon.");
  }

  return {
    coupon,
    discountPaise: computeCouponDiscount({
      type: coupon.type,
      value: coupon.value,
      amountPaise: input.amountPaise,
    }),
    bonusDays: coupon.type === "free_days" ? Math.max(0, coupon.value) : 0,
  };
}

/**
 * Creates the local pending order and reserves its coupon in one transaction. Prices, credits, and validity are snapshots from the catalog at checkout time.
 */
async function createPendingOrder(
  input: {
    userId: string;
    orderType: OrderType;
    legacyPlanId: number | null;
    catalogPlanId: number | null;
    catalogPriceId: number | null;
    packId: number | null;
    currency: string;
    listPricePaise: number;
    sellingPricePaise: number;
    baseValidityDays: number;
    creditsTotal: number;
    couponCode: string | null;
    notes: string;
    parentOrderId?: string | null;
    bundleId?: number | null;
    bundlePlanCredits?: number;
    bundlePackCredits?: number;
    bundlePackValidityDays?: number | null;
  },
  client: PoolClient
): Promise<OrderRow> {
  const coupon = input.couponCode
    ? await resolveCouponForCheckout(client, {
        code: input.couponCode,
        userId: input.userId,
        planId: input.catalogPlanId,
        amountPaise: input.sellingPricePaise,
      })
    : null;

  const discountPaise = coupon?.discountPaise ?? 0;
  const amountPaise = input.sellingPricePaise - discountPaise;
  requireAmount(amountPaise);

  const validityDays = Math.max(1, input.baseValidityDays + (coupon?.bonusDays ?? 0));
  const totalDiscount =
    Math.max(0, input.listPricePaise - input.sellingPricePaise) + discountPaise;

  const order = await billingRepository.insertOrder(
    {
      orderNo: orderNumber(),
      userId: input.userId,
      orderType: input.orderType,
      planId: input.legacyPlanId,
      catalogPlanId: input.catalogPlanId,
      catalogPriceId: input.catalogPriceId,
      packId: input.packId,
      amountPaise,
      mrpPaise: input.listPricePaise,
      discountPaise: totalDiscount,
      currency: input.currency,
      validityDays,
      creditsTotal: Math.max(0, input.creditsTotal),
      couponId: coupon?.coupon.id ?? null,
      couponCode: coupon?.coupon.code ?? null,
      notes: input.notes.slice(0, 255),
      parentOrderId: input.parentOrderId ?? null,
      bundleId: input.bundleId ?? null,
      bundlePlanCredits: input.bundlePlanCredits ?? 0,
      bundlePackCredits: input.bundlePackCredits ?? 0,
      bundlePackValidityDays: input.bundlePackValidityDays ?? null,
    },
    client
  );

  if (coupon) {
    await billingRepository.reserveCoupon(
      { couponId: coupon.coupon.id, userId: input.userId, orderId: order.id },
      client
    );
  }

  return order;
}

/**
 * Creates the Razorpay order for an already-persisted local order and attaches the gateway id. Failures mark the local order failed and release any coupon reservation.
 */
async function startGatewayOrder(
  order: OrderRow,
  notes: Record<string, string>
): Promise<OrderRow> {
  const config = requireGatewayConfig();
  const client = new RazorpayClient(config);

  try {
    const gatewayOrder = await client.createOrder({
      amountPaise: order.amountPaise,
      currency: order.currency,
      receipt: order.orderNo,
      notes: { ...notes, local_order_id: order.id, order_no: order.orderNo },
    });

    if (
      gatewayOrder.amount !== order.amountPaise ||
      gatewayOrder.currency.toUpperCase() !== order.currency.toUpperCase()
    ) {
      throw new RazorpayGatewayError(
        "Razorpay returned an order with a mismatched amount or currency",
        null,
        "ORDER_MISMATCH"
      );
    }

    return await billingRepository.attachGatewayOrder(
      { orderId: order.id, gatewayOrderId: gatewayOrder.id, payload: gatewayOrder },
      pool
    );
  } catch (error) {
    console.error("Razorpay order creation failed", {
      orderId: order.id,
      orderNo: order.orderNo,
      message: gatewayErrorMessage(error),
    });

    await withTransaction(async (client) => {
      const failed = await billingRepository.markOrderFailed(
        { orderId: order.id, reason: gatewayErrorMessage(error) },
        client
      );
      if (failed) {
        await billingRepository.releaseCouponReservation(order.id, client);
      }
    });

    if (error instanceof BillingError) throw error;
    throw new BillingError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Could not start the payment. Please try again."
    );
  }
}

/**
 * Formats a credit-pack order for the frontend checkout. It exposes the gateway key id and the server-owned amount and credits.
 */
function creditOrderResponse(
  order: OrderRow,
  packCode: string,
  keyId: string
): CreditOrderResponse {
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    razorpayOrderId: order.gatewayOrderId ?? "",
    amountPaise: order.amountPaise,
    currency: order.currency,
    packId: packCode,
    credits: order.creditsTotal,
    validityDays: order.validityDays,
    keyId,
  };
}

/**
 * Formats a plan order for the frontend checkout. It includes the plan identity, server-owned amount, credits, and validity.
 */
function planOrderResponse(
  order: OrderRow,
  plan: PurchasablePlan,
  keyId: string
): PlanOrderResponse {
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    razorpayOrderId: order.gatewayOrderId ?? "",
    amountPaise: order.amountPaise,
    currency: order.currency,
    planId: plan.planId,
    planSlug: plan.slug,
    planName: plan.name,
    credits: order.creditsTotal,
    validityDays: order.validityDays,
    keyId,
  };
}

/**
 * Formats a bundle order for the frontend checkout. The pay button, credits and
 * value copy all use this server-owned snapshot.
 */
function bundleOrderResponse(
  order: OrderRow,
  bundle: PurchasablePlanBundle,
  keyId: string
): BundleOrderResponse {
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    razorpayOrderId: order.gatewayOrderId ?? "",
    amountPaise: order.amountPaise,
    currency: order.currency,
    bundleId: bundle.id,
    planId: bundle.planId,
    planSlug: bundle.plan.slug,
    planName: bundle.plan.name,
    planCredits: order.bundlePlanCredits,
    packId: bundle.packId,
    packCode: bundle.pack.code,
    packName: bundle.pack.name,
    packCredits: order.bundlePackCredits,
    packValidityDays: order.bundlePackValidityDays ?? bundle.pack.validityDays,
    credits: order.bundlePlanCredits + order.bundlePackCredits,
    validityDays: order.validityDays,
    keyId,
  };
}

/**
 * Creates, converts, or extends the user's subscription based on the purchased plan. It returns the exact order window used for credits and entitlement access.
 */
async function activatePlanSubscription(
  client: PoolClient,
  order: OrderRow,
  now: Date
): Promise<{ subscriptionId: number; startsAt: Date; expiresAt: Date }> {
  if (order.catalogPlanId === null) {
    throw new BillingError(409, "PLAN_UNAVAILABLE", "This plan is no longer available.");
  }

  const current = await billingRepository.findActiveSubscriptionForUpdate(order.userId, client);
  const placement = computeSubscriptionPlacement({
    current,
    planId: order.catalogPlanId,
    now,
    validityDays: order.validityDays,
  });
  const priceId = requireOrderPriceId(order);

  if (placement.useExisting && current) {
    await billingRepository.updateSubscriptionPeriod(
      {
        subscriptionId: current.id,
        priceId,
        periodStart: placement.startsAt,
        periodEnd: placement.expiresAt,
      },
      client
    );
    return {
      subscriptionId: current.id,
      startsAt: placement.startsAt,
      expiresAt: placement.expiresAt,
    };
  }

  if (placement.cancelCurrent && current) {
    await billingRepository.cancelSubscription(
      { subscriptionId: current.id, reason: "plan_change" },
      client
    );
  }

  const subscriptionId = await billingRepository.insertSubscription(
    {
      userId: order.userId,
      planId: order.catalogPlanId,
      priceId,
      periodStart: placement.startsAt,
      periodEnd: placement.expiresAt,
      notes: `Order ${order.orderNo}`,
    },
    client
  );

  return {
    subscriptionId,
    startsAt: placement.startsAt,
    expiresAt: placement.expiresAt,
  };
}

/**
 * Returns the plan price snapshot stored on the order. A missing price is treated as a stale order that cannot be activated.
 */
function requireOrderPriceId(order: OrderRow): number {
  if (order.catalogPriceId === null) {
    throw new BillingError(
      409,
      "PLAN_PRICE_UNAVAILABLE",
      "This plan no longer has a valid price."
    );
  }
  return order.catalogPriceId;
}

/**
 * Checks that a gateway payment belongs to the order and matches its amount, currency, and captured status. Any mismatch aborts activation.
 */
function validateGatewayPayment(order: OrderRow, payment: RazorpayPayment): void {
  if (payment.order_id && order.gatewayOrderId && payment.order_id !== order.gatewayOrderId) {
    throw new BillingError(400, "PAYMENT_ORDER_MISMATCH", "Payment does not belong to this order.");
  }
  if (payment.amount !== order.amountPaise) {
    throw new BillingError(400, "PAYMENT_AMOUNT_MISMATCH", "The paid amount does not match this order.");
  }
  if (payment.currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new BillingError(400, "PAYMENT_CURRENCY_MISMATCH", "The payment currency does not match this order.");
  }
  if (payment.status !== "captured" && payment.captured !== true) {
    throw new BillingError(
      409,
      "PAYMENT_NOT_CAPTURED",
      "Payment is not captured yet. Your account will be updated once the gateway confirms it."
    );
  }
}

/**
 * Creates the two paid grant orders for a bundle: one plan grant (subscription
 * window) and one pack grant (its own validity). Both inserts happen inside the
 * parent payment transaction, so a bundle grants both or neither.
 */
async function grantBundleChildrenTx(
  client: PoolClient,
  parent: OrderRow,
  now: Date,
  finalBalance: number
): Promise<void> {
  if (
    parent.packId === null ||
    parent.catalogPlanId === null ||
    parent.bundlePlanCredits < 0 ||
    parent.bundlePackCredits < 0
  ) {
    throw new BillingError(
      409,
      "BUNDLE_INVALID",
      "This bundle is missing its catalogue snapshot."
    );
  }

  const pack = await billingRepository.findCreditPackById(parent.packId, client);
  if (!pack) {
    throw new BillingError(
      409,
      "PACK_UNAVAILABLE",
      "The credit pack in this bundle is no longer available."
    );
  }

  const packValidityDays = Math.max(
    1,
    parent.bundlePackValidityDays ?? pack.validityDays
  );
  const planStartsAt = parent.startsAt ?? now;
  const planExpiresAt =
    parent.expiresAt ?? addDays(planStartsAt, Math.max(1, parent.validityDays));
  const packStartsAt = now;
  const packExpiresAt = addDays(packStartsAt, packValidityDays);

  const planGrant = await billingRepository.insertBundleGrantOrder(
    {
      orderNo: orderNumber(),
      userId: parent.userId,
      parentOrderId: parent.id,
      orderType: "plan",
      planId: parent.planId,
      catalogPlanId: parent.catalogPlanId,
      catalogPriceId: parent.catalogPriceId,
      packId: null,
      validityDays: parent.validityDays,
      creditsTotal: parent.bundlePlanCredits,
      startsAt: planStartsAt,
      expiresAt: planExpiresAt,
      subscriptionId: parent.subscriptionId,
    },
    client
  );

  const packGrant = await billingRepository.insertBundleGrantOrder(
    {
      orderNo: orderNumber(),
      userId: parent.userId,
      parentOrderId: parent.id,
      orderType: "credit_pack",
      planId: null,
      catalogPlanId: null,
      catalogPriceId: null,
      packId: parent.packId,
      validityDays: packValidityDays,
      creditsTotal: parent.bundlePackCredits,
      startsAt: packStartsAt,
      expiresAt: packExpiresAt,
      subscriptionId: null,
    },
    client
  );

  if (planGrant.creditsTotal > 0) {
    await billingRepository.insertCreditTransaction(
      {
        userId: parent.userId,
        orderId: planGrant.id,
        amount: planGrant.creditsTotal,
        reason: "plan_credit_grant",
        refId: parent.orderNo,
        balanceAfter: finalBalance,
      },
      client
    );
  }
  if (packGrant.creditsTotal > 0) {
    await billingRepository.insertCreditTransaction(
      {
        userId: parent.userId,
        orderId: packGrant.id,
        amount: packGrant.creditsTotal,
        reason: "credit_pack_purchase",
        refId: parent.orderNo,
        balanceAfter: finalBalance,
      },
      client
    );
  }
}

/**
 * Applies a verified payment inside an existing transaction. It locks the user and order, activates a plan when needed, grants credits, and returns the resulting balance and subscription.
 */
async function completeOrderTx(
  client: PoolClient,
  initialOrder: OrderRow,
  payment: RazorpayPayment | null,
  signature: string | null
): Promise<CompletedOrder> {
  await lockBillingUser(client, initialOrder.userId);
  const order = await billingRepository.findOrderByIdForUpdate(initialOrder.id, client);
  if (!order) {
    throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
  }

  // Use the database clock so starts_at is never a few milliseconds in the
  // future relative to the balance query's CURRENT_TIMESTAMP on another host.
  const clock = await client.query("SELECT CURRENT_TIMESTAMP AS now");
  const now = new Date(clock.rows[0].now as string | Date);

  const plan =
    order.catalogPlanId === null
      ? null
      : await billingRepository.findPlanSummaryById(order.catalogPlanId, client);

  if (order.status === "paid") {
    if (
      payment &&
      order.gatewayPaymentId &&
      order.gatewayPaymentId !== payment.id
    ) {
      throw new BillingError(409, "ORDER_ALREADY_PAID", "This order was already paid.");
    }
    return {
      order,
      plan,
      subscriptionId: order.subscriptionId,
      balance: await billingRepository.getCreditBalance(order.userId, client),
      newlyPaid: false,
    };
  }

  if (!ACTIVE_ORDER_STATUSES.has(order.status)) {
    throw new BillingError(409, "ORDER_NOT_PAYABLE", "This order can no longer be paid.");
  }

  if (payment) validateGatewayPayment(order, payment);

  let startsAt = now;
  let expiresAt = addDays(now, Math.max(1, order.validityDays));
  let subscriptionId: number | null = order.subscriptionId;

  if (order.orderType === "plan" || order.orderType === "bundle") {
    const placement = await activatePlanSubscription(client, order, now);
    startsAt = placement.startsAt;
    expiresAt = placement.expiresAt;
    subscriptionId = placement.subscriptionId;
  }

  const updated = await billingRepository.completeOrderPaid(
    {
      orderId: order.id,
      gatewayPaymentId: payment?.id ?? null,
      paymentMethod: payment?.method ?? null,
      gatewaySignature: signature,
      gatewayPayload: payment,
      startsAt,
      expiresAt,
      creditsTotal: order.orderType === "bundle" ? 0 : order.creditsTotal,
      validityDays: order.validityDays,
      subscriptionId,
    },
    client
  );

  const balance = await billingRepository.getCreditBalance(updated.userId, client);
  if (updated.orderType === "bundle") {
    await grantBundleChildrenTx(client, updated, now, balance.total);
  } else if (updated.creditsTotal > 0) {
    await billingRepository.insertCreditTransaction(
      {
        userId: updated.userId,
        orderId: updated.id,
        amount: updated.creditsTotal,
        reason:
          updated.orderType === "plan" ? "plan_credit_grant" : "credit_pack_purchase",
        refId: updated.orderNo,
        balanceAfter: balance.total,
      },
      client
    );
  }

  return { order: updated, plan, subscriptionId, balance, newlyPaid: true };
}

/**
 * Runs cache invalidation and audit logging after a plan transaction commits. Failures here are logged because the paid entitlement must not be rolled back.
 */
async function afterOrderActivated(result: CompletedOrder): Promise<void> {
  if (result.newlyPaid) {
    await invoiceService.sendOrderEmails(result.order);
  }
  if (result.order.orderType !== "plan" && result.order.orderType !== "bundle") {
    return;
  }
  try {
    await invalidateEntitlements(result.order.userId);
  } catch (error) {
    console.error("Failed to invalidate entitlement cache after purchase", error);
  }
  await writeSubscriptionAudit({
    actorId: Number(result.order.userId),
    actorRole: "user",
    action:
      result.order.status === "refunded"
        ? "subscription.refund"
        : "subscription.purchase",
    entityType: "subscription",
    entityId: result.subscriptionId,
    after: {
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      orderType: result.order.orderType,
      planId: result.order.catalogPlanId,
      planSlug: result.plan?.slug ?? null,
      packId: result.order.packId,
      startsAt: result.order.startsAt,
      expiresAt: result.order.expiresAt,
      credits:
        result.order.orderType === "bundle"
          ? result.order.bundlePlanCredits + result.order.bundlePackCredits
          : result.order.creditsTotal,
    },
  });
}

/**
 * Verifies the checkout signature and fetches the payment from Razorpay. It validates the gateway order, amount, currency, and capture state before returning.
 */
async function verifySignatureAndPayment(
  order: OrderRow,
  input: VerifyCreditOrderInput
): Promise<{ payment: RazorpayPayment }> {
  const config = requireGatewayConfig();

  if (!order.gatewayOrderId) {
    throw new BillingError(409, "ORDER_NOT_READY", "This order is not ready for payment.");
  }
  const gatewayOrderId = input.razorpayOrderId || order.gatewayOrderId;
  if (gatewayOrderId !== order.gatewayOrderId) {
    throw new BillingError(400, "PAYMENT_ORDER_MISMATCH", "Payment does not belong to this order.");
  }
  if (
    !verifyPaymentSignature({
      keySecret: config.keySecret,
      orderId: gatewayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })
  ) {
    throw new BillingError(400, "INVALID_SIGNATURE", "Payment verification failed.");
  }

  let payment: RazorpayPayment;
  try {
    payment = await new RazorpayClient(config).fetchPayment(input.razorpayPaymentId);
  } catch (error) {
    console.error("Razorpay payment lookup failed", {
      paymentId: input.razorpayPaymentId,
      message: gatewayErrorMessage(error),
    });
    throw new BillingError(
      502,
      "PAYMENT_GATEWAY_ERROR",
      "Could not confirm the payment with the gateway. Please contact support if money was deducted."
    );
  }

  if (payment.id !== input.razorpayPaymentId) {
    throw new BillingError(400, "PAYMENT_MISMATCH", "Payment could not be verified.");
  }
  if (payment.order_id && payment.order_id !== order.gatewayOrderId) {
    throw new BillingError(400, "PAYMENT_ORDER_MISMATCH", "Payment does not belong to this order.");
  }
  validateGatewayPayment(order, payment);

  return { payment };
}

/**
 * Formats the idempotent response for a verified credit purchase. The transaction id is the human-readable order number.
 */
function creditVerificationResult(
  order: OrderRow,
  packCode: string,
  balance: CreditBalanceSummary
): VerifiedCreditResponse {
  return {
    transactionId: order.orderNo,
    orderId: order.id,
    packId: packCode,
    credits: order.creditsTotal,
    newBalance: balance.total,
  };
}

/**
 * Formats the response for a verified plan purchase, including the subscription and the order's access window.
 */
function planVerificationResult(
  result: CompletedOrder
): VerifiedPlanResponse {
  const { order, plan, subscriptionId, balance } = result;
  return {
    transactionId: order.orderNo,
    orderId: order.id,
    planId: order.catalogPlanId,
    planSlug: plan?.slug ?? null,
    planName: plan?.name ?? null,
    credits: order.creditsTotal,
    validityDays: order.validityDays,
    startsAt: order.startsAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    subscriptionId,
    newBalance: balance.total,
    currency: order.currency,
    amountPaise: order.amountPaise,
  };
}

/**
 * Formats a verified bundle response. Amounts and credits come from the parent
 * order snapshot and the child grants, never from the client.
 */
function bundleVerificationResult(
  order: OrderRow,
  balance: CreditBalanceSummary,
  plan: { id: number; slug: string; name: string } | null,
  pack: PurchasableCreditPack | null,
  grants: OrderRow[] = []
): VerifiedBundlePurchase {
  const packGrant = grants.find((grant) => grant.orderType === "credit_pack");
  return {
    transactionId: order.orderNo,
    orderId: order.id,
    bundleId: order.bundleId,
    planId: order.catalogPlanId,
    planSlug: plan?.slug ?? null,
    planName: plan?.name ?? null,
    packId: order.packId,
    packCode: pack?.code ?? null,
    packName: pack?.name ?? null,
    planCredits: order.bundlePlanCredits,
    packCredits: order.bundlePackCredits,
    credits: order.bundlePlanCredits + order.bundlePackCredits,
    validityDays: order.validityDays,
    packValidityDays: order.bundlePackValidityDays ?? pack?.validityDays ?? null,
    startsAt: order.startsAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    packExpiresAt:
      packGrant?.expiresAt?.toISOString() ??
      (order.startsAt == null
        ? null
        : addDays(
            order.startsAt,
            order.bundlePackValidityDays ?? pack?.validityDays ?? 180
          ).toISOString()),
    subscriptionId: order.subscriptionId,
    newBalance: balance.total,
    currency: order.currency,
    amountPaise: order.amountPaise,
  };
}

export class BillingService {
  /**
   * Reports whether checkout can run on this instance. The public config endpoint exposes the same answer to the client.
   */
  isConfigured(): boolean {
    return Boolean(getRazorpayConfig());
  }

  /**
   * Returns the non-secret checkout configuration. The Razorpay key id is public by design; the key secret never leaves the server.
   */
  getPublicConfig(): { configured: boolean; keyId: string | null } {
    const config = getRazorpayConfig();
    return { configured: Boolean(config), keyId: config?.keyId ?? null };
  }

  /**
   * Returns the server-owned upsell for a selected plan or pack. Prices,
   * eligibility, and per-credit value are computed here, never in the client.
   */
  async getCheckoutSuggestion(
    userId: string | null,
    input: {
      planId?: number | null;
      planSlug?: string | null;
      packId?: string | number | null;
    }
  ): Promise<CheckoutSuggestionResponse> {
    const packs = await billingRepository.listPurchasableCreditPacks();

    if (input.planId != null || input.planSlug) {
      const plan = await billingRepository.findPurchasablePlan({
        planId: input.planId ?? null,
        planSlug: input.planSlug ?? null,
      });
      if (!plan) {
        throw new BillingError(404, "PLAN_NOT_FOUND", "This plan is not available.");
      }

      const hasActivePlan = userId
        ? await billingRepository.hasActivePlanOrder(userId)
        : false;
      const bundle = await billingRepository.findPlanBundleForPlan(plan.planId);
      const suggestion = bundle
        ? buildPlanBundleSuggestion({ bundle, hasActivePlan })
        : null;
      if (suggestion) {
        return { suggestion, planCode: plan.slug };
      }

      // Subscribers cannot buy a second plan, so fall back to the best pack
      // upgrade (if they do not already own it).
      if (userId && hasActivePlan && packs.length > 1) {
        const holdings = await billingRepository.getActivePackHoldings(userId);
        const highestOwned = holdings[0]?.priceInr ?? null;
        const source = [...packs].sort((a, b) => a.priceInr - b.priceInr)[0];
        return {
          suggestion: buildPackUpgradeSuggestion({
            selectedPack: source,
            packs,
            highestOwnedPackPriceInr: highestOwned,
          }),
          planCode: plan.slug,
        };
      }

      return { suggestion: null, planCode: plan.slug };
    }

    if (input.packId == null) {
      throw new BillingError(400, "SUGGESTION_INPUT_REQUIRED", "Select a plan or pack first.");
    }
    const selectedPack = await billingRepository.findPurchasableCreditPack(
      String(input.packId)
    );
    if (!selectedPack) {
      throw new BillingError(404, "PACK_NOT_FOUND", "This credit pack is not available.");
    }

    const holdings = userId
      ? await billingRepository.getActivePackHoldings(userId)
      : [];
    return {
      suggestion: buildPackUpgradeSuggestion({
        selectedPack,
        packs,
        highestOwnedPackPriceInr: holdings[0]?.priceInr ?? null,
      }),
      planCode: null,
    };
  }

  /**
   * Best-effort checkout funnel telemetry. A logging failure must never block
   * a purchase or a UI action.
   */
  async recordCheckoutEvent(
    userId: string | null,
    input: {
      event:
        | "suggestion_shown"
        | "suggestion_accepted"
        | "suggestion_declined"
        | "switch_back"
        | "purchase_completed";
      suggestionType: "A" | "B" | null;
      sourceProductId: string | null;
      productId: string | null;
      planCode: string | null;
      sessionId: string | null;
    }
  ): Promise<{ recorded: boolean }> {
    try {
      await billingRepository.insertCheckoutSuggestionEvent({
        userId,
        event: input.event,
        suggestionType: input.suggestionType,
        sourceProductId: input.sourceProductId,
        productId: input.productId,
        planCode: input.planCode,
        sessionId: input.sessionId,
      });
      return { recorded: true };
    } catch (error) {
      console.error("Checkout suggestion event could not be recorded", {
        event: input.event,
        message: error instanceof Error ? error.message : String(error),
      });
      return { recorded: false };
    }
  }

  /**
   * Creates or reuses a pending credit-pack order, reserves its coupon, and starts Razorpay checkout. The server ignores client prices and uses the pack catalog.
   */
  async createCreditOrder(
    userId: string,
    input: { packId: string; couponCode: string | null; currency?: string | null }
  ): Promise<CreditOrderResponse> {
    const config = requireGatewayConfig();
    const pack = await billingRepository.findPurchasableCreditPack(input.packId);
    if (!pack) {
      throw new BillingError(404, "PACK_NOT_FOUND", "This credit pack is not available.");
    }

    const currency = resolveCurrency("INR", input.currency);
    const couponCode = normalizeCouponCode(input.couponCode);

    let prepared: { order: OrderRow; created: boolean };
    try {
      prepared = await withTransaction(async (client) => {
        await lockBillingUser(client, userId);
        const reusable = await billingRepository.findReusablePendingOrder(
          {
            userId,
            orderType: "credit_pack",
            catalogPlanId: null,
            packId: pack.id,
            couponCode,
          },
          client
        );
        if (reusable) return { order: reusable, created: false };

        const order = await createPendingOrder(
          {
            userId,
            orderType: "credit_pack",
            legacyPlanId: null,
            catalogPlanId: null,
            catalogPriceId: null,
            packId: pack.id,
            currency,
            listPricePaise: pack.priceInr * 100,
            sellingPricePaise: pack.priceInr * 100,
            baseValidityDays: Math.max(1, pack.validityDays),
            creditsTotal: pack.credits,
            couponCode,
            notes: `AI credit pack: ${pack.name}`,
          },
          client
        );
        return { order, created: true };
      });
    } catch (error) {
      if (isUniqueViolation(error, "uq_orders_open_checkout")) {
        throw new BillingError(
          409,
          "CHECKOUT_IN_PROGRESS",
          "A checkout for this item is already being created. Please try again in a moment."
        );
      }
      throw error;
    }

    if (!prepared.created) {
      return creditOrderResponse(prepared.order, pack.code, config.keyId);
    }

    const withGateway = await startGatewayOrder(
      prepared.order,
      packOrderNotes(pack, prepared.order.id)
    );
    return creditOrderResponse(withGateway, pack.code, config.keyId);
  }

  /**
   * Creates or reuses a pending plan order, reserves its coupon, and starts Razorpay checkout. The plan's latest monthly price and credits are snapshotted.
   */
  async createPlanOrder(
    userId: string,
    input: {
      planId?: number | null;
      planSlug?: string | null;
      couponCode: string | null;
      currency?: string | null;
    }
  ): Promise<PlanOrderResponse> {
    const config = requireGatewayConfig();
    const plan = await billingRepository.findPurchasablePlan({
      planId: input.planId ?? null,
      planSlug: input.planSlug ?? null,
    });
    if (!plan) {
      throw new BillingError(404, "PLAN_NOT_FOUND", "This plan is not available.");
    }

    const currency = resolveCurrency(plan.currency, input.currency);
    const couponCode = normalizeCouponCode(input.couponCode);

    const legacyPlanId = await billingRepository.findLegacyMonthlyPlanId(plan.slug);
    const validityDays = validityDaysForPeriod(plan.billingPeriod, plan.customDays);

    let prepared: { order: OrderRow; created: boolean };
    try {
      prepared = await withTransaction(async (client) => {
        await lockBillingUser(client, userId);
        const reusable = await billingRepository.findReusablePendingOrder(
          {
            userId,
            orderType: "plan",
            catalogPlanId: plan.planId,
            packId: null,
            couponCode,
          },
          client
        );
        if (reusable) return { order: reusable, created: false };

        const order = await createPendingOrder(
          {
            userId,
            orderType: "plan",
            legacyPlanId,
            catalogPlanId: plan.planId,
            catalogPriceId: plan.priceId,
            packId: null,
            currency,
            listPricePaise: plan.mrpAmountPaise ?? plan.amountPaise,
            sellingPricePaise: plan.amountPaise,
            baseValidityDays: validityDays,
            creditsTotal: Math.max(0, plan.credits),
            couponCode,
            notes: `Plan: ${plan.name}`,
          },
          client
        );
        return { order, created: true };
      });
    } catch (error) {
      if (isUniqueViolation(error, "uq_orders_open_checkout")) {
        throw new BillingError(
          409,
          "CHECKOUT_IN_PROGRESS",
          "A checkout for this plan is already being created. Please try again in a moment."
        );
      }
      throw error;
    }

    if (!prepared.created) {
      return planOrderResponse(prepared.order, plan, config.keyId);
    }

    const withGateway = await startGatewayOrder(
      prepared.order,
      planOrderNotes(plan, prepared.order.id)
    );
    return planOrderResponse(withGateway, plan, config.keyId);
  }

  /**
   * Creates the parent bundle checkout. Eligibility, catalogue prices, coupon
   * applicability, and the discount snapshot are all validated server-side.
   */
  async createBundleOrder(
    userId: string,
    input: {
      bundleId: number;
      couponCode: string | null;
      currency?: string | null;
    }
  ): Promise<BundleOrderResponse> {
    const config = requireGatewayConfig();
    const bundle = await billingRepository.findPlanBundleById(input.bundleId);
    if (!bundle) {
      throw new BillingError(404, "BUNDLE_NOT_FOUND", "This bundle is not available.");
    }

    const plan = bundle.plan;
    const pack = bundle.pack;
    const planValidityDays = validityDaysForPeriod(
      plan.billingPeriod,
      plan.customDays
    );
    const regularPaise = Math.max(
      bundle.mrpPaise,
      plan.amountPaise + pack.priceInr * 100
    );
    if (bundle.amountPaise <= 0 || bundle.amountPaise >= regularPaise) {
      throw new BillingError(
        409,
        "BUNDLE_INVALID",
        "This bundle is not currently available at a valid price."
      );
    }

    const currency = resolveCurrency(plan.currency, input.currency);
    const couponCode = normalizeCouponCode(input.couponCode);
    const legacyPlanId = await billingRepository.findLegacyMonthlyPlanId(plan.slug);

    let prepared: { order: OrderRow; created: boolean };
    try {
      prepared = await withTransaction(async (client) => {
        await lockBillingUser(client, userId);
        if (await billingRepository.hasActivePlanOrder(userId, client)) {
          throw new BillingError(
            409,
            "PLAN_ALREADY_ACTIVE",
            "You already have an active plan. Choose a credit pack instead."
          );
        }

        const reusable = await billingRepository.findReusablePendingOrder(
          {
            userId,
            orderType: "bundle",
            catalogPlanId: plan.planId,
            packId: pack.id,
            couponCode,
          },
          client
        );
        if (reusable) return { order: reusable, created: false };

        const order = await createPendingOrder(
          {
            userId,
            orderType: "bundle",
            legacyPlanId,
            catalogPlanId: plan.planId,
            catalogPriceId: plan.priceId,
            packId: pack.id,
            currency,
            listPricePaise: regularPaise,
            sellingPricePaise: bundle.amountPaise,
            baseValidityDays: planValidityDays,
            creditsTotal: 0,
            couponCode,
            notes: `Bundle: ${bundle.name}`,
            bundleId: bundle.id,
            bundlePlanCredits: Math.max(0, plan.credits),
            bundlePackCredits: Math.max(0, pack.credits),
            bundlePackValidityDays: Math.max(1, pack.validityDays),
          },
          client
        );
        return { order, created: true };
      });
    } catch (error) {
      if (isUniqueViolation(error, "uq_orders_open_checkout")) {
        throw new BillingError(
          409,
          "CHECKOUT_IN_PROGRESS",
          "A checkout for this bundle is already being created. Please try again in a moment."
        );
      }
      throw error;
    }

    if (!prepared.created) {
      return bundleOrderResponse(prepared.order, bundle, config.keyId);
    }

    const withGateway = await startGatewayOrder(
      prepared.order,
      bundleOrderNotes(bundle, prepared.order.id)
    );
    return bundleOrderResponse(withGateway, bundle, config.keyId);
  }

  /**
   * Verifies a credit-pack payment and grants credits exactly once. Already-paid orders return the current balance without re-granting.
   */
  async verifyCreditOrder(
    userId: string,
    input: VerifyCreditOrderInput
  ): Promise<VerifiedCreditResponse> {
    const order = await billingRepository.findOrderForUser(userId, input.orderKey);
    if (!order) {
      throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    if (order.orderType !== "credit_pack") {
      throw new BillingError(400, "WRONG_ORDER_TYPE", "This is not a credit-pack order.");
    }

    const pack = order.packId
      ? await billingRepository.findCreditPackById(order.packId)
      : null;
    const packCode = pack?.code ?? String(order.packId ?? "");

    if (order.status === "paid") {
      const balance = await billingRepository.getCreditBalance(order.userId);
      return creditVerificationResult(order, packCode, balance);
    }

    const { payment } = await verifySignatureAndPayment(order, input);

    const completed = await withTransaction((client) =>
      completeOrderTx(client, order, payment, input.razorpaySignature)
    );
    await afterOrderActivated(completed);

    return creditVerificationResult(completed.order, packCode, completed.balance);
  }

  /**
   * Verifies a plan payment and activates or extends the subscription exactly once. Already-paid orders return their stored subscription details.
   */
  async verifyPlanOrder(
    userId: string,
    input: VerifyCreditOrderInput
  ): Promise<VerifiedPlanResponse> {
    const order = await billingRepository.findOrderForUser(userId, input.orderKey);
    if (!order) {
      throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    if (order.orderType !== "plan") {
      throw new BillingError(400, "WRONG_ORDER_TYPE", "This is not a plan order.");
    }

    if (order.status === "paid") {
      const plan =
        order.catalogPlanId === null
          ? null
          : await billingRepository.findPlanSummaryById(order.catalogPlanId);
      return planVerificationResult({
        order,
        plan,
        subscriptionId: order.subscriptionId,
        balance: await billingRepository.getCreditBalance(order.userId),
        newlyPaid: false,
      });
    }

    const { payment } = await verifySignatureAndPayment(order, input);
    const completed = await withTransaction((client) =>
      completeOrderTx(client, order, payment, input.razorpaySignature)
    );
    await afterOrderActivated(completed);
    return planVerificationResult(completed);
  }

  /**
   * Verifies a bundle payment. The parent owns the gateway payment; children are
   * granted atomically inside the same transaction.
   */
  async verifyBundleOrder(
    userId: string,
    input: VerifyCreditOrderInput
  ): Promise<VerifiedBundlePurchase> {
    const order = await billingRepository.findOrderForUser(userId, input.orderKey);
    if (!order) {
      throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    if (order.orderType !== "bundle") {
      throw new BillingError(400, "WRONG_ORDER_TYPE", "This is not a bundle order.");
    }

    const plan =
      order.catalogPlanId === null
        ? null
        : await billingRepository.findPlanSummaryById(order.catalogPlanId);
    const pack =
      order.packId === null
        ? null
        : await billingRepository.findCreditPackById(order.packId);

    if (order.status === "paid") {
      const grants = await billingRepository.listBundleGrantOrders(order.id);
      return bundleVerificationResult(
        order,
        await billingRepository.getCreditBalance(order.userId),
        plan,
        pack,
        grants
      );
    }

    const { payment } = await verifySignatureAndPayment(order, input);
    const completed = await withTransaction((client) =>
      completeOrderTx(client, order, payment, input.razorpaySignature)
    );
    await afterOrderActivated(completed);
    const grants = await billingRepository.listBundleGrantOrders(completed.order.id);
    return bundleVerificationResult(
      completed.order,
      completed.balance,
      completed.plan,
      pack,
      grants
    );
  }

  /**
   * Returns the user's current plan and purchased credit balance. The repository applies the active and unexpired filters.
   */
  async getCreditBalance(userId: string): Promise<CreditBalanceSummary> {
    return billingRepository.getCreditBalance(userId);
  }

  /**
   * Returns a compact order history for the billing page. Timestamps are serialized as ISO strings and money remains in paise.
   */
  async listOrders(userId: string, limit = 50): Promise<
    Array<{
      orderId: string;
      orderNo: string;
      orderType: OrderType;
      status: string;
      amountPaise: number;
      currency: string;
      credits: number;
      creditsRemaining: number;
      validityDays: number;
      planSlug: string | null;
      planName: string | null;
      packCode: string | null;
      packName: string | null;
      createdAt: string;
      paidAt: string | null;
      startsAt: string | null;
      expiresAt: string | null;
      isActive: boolean;
      paymentMethod: string | null;
      gatewayPaymentId: string | null;
    }>
  > {
    const rows = await billingRepository.listUserOrders(userId, limit);
    return rows.map((row) => ({
      orderId: row.id,
      orderNo: row.orderNo,
      orderType: row.orderType,
      status: row.status,
      amountPaise: row.amountPaise,
      currency: row.currency,
      credits: row.creditsTotal,
      creditsRemaining: row.creditsRemaining,
      validityDays: row.validityDays,
      planSlug: row.planSlug,
      planName: row.planName,
      packCode: row.packCode,
      packName: row.packName,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      isActive: row.isActive,
      paymentMethod: row.paymentMethod,
      gatewayPaymentId: row.gatewayPaymentId,
    }));
  }

  /**
   * Returns one order with its payment and validity status. Polling clients can use this while a webhook or verification is still settling.
   */
  async getOrder(userId: string, orderKey: string): Promise<Record<string, unknown>> {
    const order = await billingRepository.findOrderForUser(userId, orderKey);
    if (!order) {
      throw new BillingError(404, "ORDER_NOT_FOUND", "Order not found.");
    }
    const grants =
      order.orderType === "bundle"
        ? await billingRepository.listBundleGrantOrders(order.id)
        : [];
    return {
      orderId: order.id,
      orderNo: order.orderNo,
      orderType: order.orderType,
      status: order.status,
      amountPaise: order.amountPaise,
      currency: order.currency,
      credits:
        order.orderType === "bundle"
          ? grants.reduce((sum, grant) => sum + grant.creditsTotal, 0)
          : order.creditsTotal,
      creditsRemaining:
        order.orderType === "bundle"
          ? grants.reduce((sum, grant) => sum + grant.creditsRemaining, 0)
          : order.creditsRemaining,
      planId: order.catalogPlanId,
      packId: order.packId,
      startsAt: order.startsAt?.toISOString() ?? null,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      failureReason: order.failureReason,
    };
  }

  /**
   * Returns the canonical invoice snapshot for one user-owned paid order.
   */
  async getInvoice(userId: string, orderKey: string) {
    return invoiceService.getInvoiceForUser(userId, orderKey);
  }

  /**
   * Renders the invoice PDF for download.
   */
  async getInvoicePdf(userId: string, orderKey: string) {
    return invoiceService.getInvoicePdfForUser(userId, orderKey);
  }

  /**
   * Re-sends the invoice email with the PDF attached.
   */
  async emailInvoice(userId: string, orderKey: string) {
    return invoiceService.emailInvoiceForUser(userId, orderKey);
  }

  /**
   * Verifies a Razorpay webhook signature, deduplicates its event id, and applies the matching payment, failure, or refund action. Business actions and event recording commit together.
   */
  async processWebhook(input: {
    rawBody: Buffer | string;
    signature: string | null;
    eventId: string | null;
    body: unknown;
  }): Promise<WebhookResult> {
    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      throw new BillingError(
        503,
        "WEBHOOK_NOT_CONFIGURED",
        "Razorpay webhook verification is not configured."
      );
    }
    if (!input.signature) {
      throw new BillingError(400, "INVALID_SIGNATURE", "Missing webhook signature.");
    }
    if (
      !verifyWebhookSignature({
        webhookSecret,
        rawBody: input.rawBody,
        signature: input.signature,
      })
    ) {
      throw new BillingError(400, "INVALID_SIGNATURE", "Invalid webhook signature.");
    }

    const body = asRecord(input.body);
    const eventType = typeof body?.event === "string" ? body.event : "";
    if (!eventType) {
      throw new BillingError(400, "INVALID_WEBHOOK", "Webhook event type is missing.");
    }

    const eventId = this.webhookEventId(input.eventId, input.rawBody);

    const outcome = await withTransaction(async (client) => {
      const isNew = await billingRepository.recordGatewayEvent(
        { eventId, eventType, payload: input.body },
        client
      );
      if (!isNew) return { duplicate: true, completed: null as CompletedOrder | null };

      let completed: CompletedOrder | null = null;
      const payload = asRecord(body?.payload);
      const payment = extractPayment(payload);
      const refund = extractRefund(payload);

      if (eventType === "payment.captured" && payment) {
        completed = await this.completeFromGatewayPayment(client, payment);
      } else if (eventType === "order.paid" && payment) {
        completed = await this.completeFromGatewayPayment(client, payment);
      } else if (eventType === "payment.failed" && payment) {
        await this.failFromGatewayPayment(client, payment);
      } else if (
        (eventType === "refund.processed" || eventType === "payment.refunded") &&
        refund
      ) {
        completed = await this.refundFromGateway(client, refund);
      }

      await billingRepository.markGatewayEventProcessed(eventId, client);
      return { duplicate: false, completed };
    });

    if (outcome.completed) {
      await afterOrderActivated(outcome.completed);
    }

    return { duplicate: outcome.duplicate, eventType };
  }

  /**
   * Uses the event id header when it fits the storage column, otherwise hashes the raw body. This keeps retries stable even when the header is missing.
   */
  private webhookEventId(headerValue: string | null, rawBody: Buffer | string): string {
    const header = (headerValue ?? "").trim();
    if (header && header.length <= 160) return header;
    return createHash("sha256").update(rawBody).digest("hex");
  }

  /**
   * Finds the local order for a captured payment and completes it. Unknown orders are logged and acknowledged so webhook retries cannot stall.
   */
  private async completeFromGatewayPayment(
    client: PoolClient,
    payment: RazorpayPayment
  ): Promise<CompletedOrder | null> {
    if (!payment.order_id) return null;
    const order = await billingRepository.findOrderByGatewayOrderId(payment.order_id, client);
    if (!order) {
      console.warn("Razorpay webhook references an unknown order", payment.order_id);
      return null;
    }
    return completeOrderTx(client, order, payment, null);
  }

  /**
   * Marks a pending order failed after a payment failure and releases its coupon. Successful orders are never downgraded by a late failure event.
   */
  private async failFromGatewayPayment(
    client: PoolClient,
    payment: RazorpayPayment
  ): Promise<void> {
    if (!payment.order_id) return;
    const order = await billingRepository.findOrderByGatewayOrderId(payment.order_id, client);
    if (!order || order.status !== "pending") return;

    const failed = await billingRepository.markOrderFailed(
      {
        orderId: order.id,
        reason: payment.error_description || "Payment failed",
      },
      client
    );
    if (failed) {
      await billingRepository.releaseCouponReservation(order.id, client);
    }
  }

  /**
   * Applies a full or partial refund to a paid order. Full refunds deactivate credits, reverse remaining balance, and cancel any linked subscription.
   */
  private async refundFromGateway(
    client: PoolClient,
    refund: RazorpayRefund
  ): Promise<CompletedOrder | null> {
    const order = await billingRepository.findOrderByGatewayPaymentId(refund.payment_id, client);
    if (!order || order.status !== "paid") return null;

    await lockBillingUser(client, order.userId);
    const locked = await billingRepository.findOrderByIdForUpdate(order.id, client);
    if (!locked || locked.status !== "paid") return null;

    const refundAmount = Math.max(0, Number(refund.amount) || 0);
    const cumulativeRefund = locked.refundAmountPaise + refundAmount;

    if (cumulativeRefund < locked.amountPaise) {
      await billingRepository.recordPartialRefund(
        {
          orderId: locked.id,
          refundAmountPaise: refundAmount,
          reason: `Partial refund ${refund.id}`,
        },
        client
      );
      return null;
    }

    const refunded = await billingRepository.refundOrder(
      {
        orderId: locked.id,
        refundAmountPaise: cumulativeRefund,
        reason: `Refund ${refund.id}`,
      },
      client
    );
    if (!refunded) return null;

    if (refunded.subscriptionId !== null) {
      await billingRepository.cancelSubscription(
        { subscriptionId: refunded.subscriptionId, reason: "payment_refunded" },
        client
      );
    }

    let balance = await billingRepository.getCreditBalance(refunded.userId, client);
    if (refunded.orderType === "bundle") {
      const grants = await billingRepository.refundBundleGrantOrders(
        refunded.id,
        `Refund ${refund.id}`,
        client
      );
      balance = await billingRepository.getCreditBalance(refunded.userId, client);
      for (const grant of grants) {
        if (grant.creditsRemaining <= 0) continue;
        await billingRepository.insertCreditTransaction(
          {
            userId: refunded.userId,
            orderId: grant.id,
            amount: -grant.creditsRemaining,
            reason: "refund",
            refId: refunded.orderNo,
            balanceAfter: balance.total,
          },
          client
        );
      }
    } else if (refunded.creditsRemaining > 0) {
      await billingRepository.insertCreditTransaction(
        {
          userId: refunded.userId,
          orderId: refunded.id,
          amount: -refunded.creditsRemaining,
          reason: "refund",
          refId: refunded.orderNo,
          balanceAfter: balance.total,
        },
        client
      );
    }

    return {
      order: refunded,
      plan:
        refunded.catalogPlanId === null
          ? null
          : await billingRepository.findPlanSummaryById(refunded.catalogPlanId, client),
      subscriptionId: refunded.subscriptionId,
      balance,
      newlyPaid: false,
    };
  }
}

/**
 * Narrows an unknown JSON value to a plain object. Webhook payload extraction uses it before touching nested fields.
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Pulls a Razorpay payment entity out of a webhook payload. It rejects malformed objects so handlers never operate on partial data.
 */
function extractPayment(payload: Record<string, unknown> | null): RazorpayPayment | null {
  const container = asRecord(payload?.payment);
  const entity = asRecord(container?.entity);
  if (!entity || typeof entity.id !== "string" || typeof entity.order_id !== "string") {
    return null;
  }
  if (typeof entity.amount !== "number" || typeof entity.currency !== "string") {
    return null;
  }
  return entity as unknown as RazorpayPayment;
}

/**
 * Pulls a Razorpay refund entity out of a webhook payload. Required fields are checked before the refund handler runs.
 */
function extractRefund(payload: Record<string, unknown> | null): RazorpayRefund | null {
  const container = asRecord(payload?.refund);
  const entity = asRecord(container?.entity);
  if (
    !entity ||
    typeof entity.id !== "string" ||
    typeof entity.payment_id !== "string" ||
    typeof entity.amount !== "number"
  ) {
    return null;
  }
  return entity as unknown as RazorpayRefund;
}

export const billingService = new BillingService();
