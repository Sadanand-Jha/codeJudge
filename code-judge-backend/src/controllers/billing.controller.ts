// Razorpay checkout HTTP handlers. Authenticated routes are mounted after the
// v1 auth guard; the webhook route is mounted before it in billing.routes.ts.

import type { Request, Response } from "express";
import { billingService } from "../services/billing.service.ts";
import { isBillingError } from "../services/billing/errors.ts";

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * Reads the authenticated user id attached by the auth middleware. The routes are mounted behind that middleware, so a missing value is a programming error.
 */
function userIdFrom(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error("Authenticated route reached without a user");
  }
  return userId;
}

/**
 * Serializes a billing error into the API envelope and hides unexpected internal failures. Logs keep the diagnostic detail while clients receive a safe message.
 */
function sendBillingError(res: Response, error: unknown): void {
  if (isBillingError(error)) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  console.error("Billing request failed", error);
  res.status(500).json({
    success: false,
    code: "BILLING_ERROR",
    message: "Something went wrong while processing this request.",
  });
}

/**
 * Normalizes a possibly repeated HTTP header to one string. Razorpay sends single values, but Express types allow arrays.
 */
function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Returns whether checkout is configured and the public Razorpay key id. This endpoint stays anonymous so the client can decide whether to enable payments.
 */
export const getBillingConfigHandler = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: billingService.getPublicConfig() });
};

/**
 * Validates the user's credit-pack selection and asks the service to create or reuse a Razorpay order. Client-supplied amounts are ignored.
 */
export const createCreditOrderHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as {
      pack_id: string | number;
      coupon?: string | null;
      coupon_code?: string | null;
      currency?: string | null;
    };
    const data = await billingService.createCreditOrder(userIdFrom(req), {
      packId: String(body.pack_id),
      couponCode: body.coupon ?? body.coupon_code ?? null,
      currency: body.currency ?? null,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Passes the checkout signature and payment ids to the service for verification. Credits are granted only after the server validates the gateway response.
 */
export const verifyCreditOrderHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as {
      order_id: string | number;
      razorpay_payment_id: string;
      razorpay_order_id?: string | null;
      razorpay_signature: string;
    };
    const data = await billingService.verifyCreditOrder(userIdFrom(req), {
      orderKey: String(body.order_id),
      razorpayOrderId: body.razorpay_order_id ?? null,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Creates a Razorpay checkout for a monthly plan selected by id or slug. The service snapshots the current price and credits.
 */
export const createPlanOrderHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as {
      plan_id?: number;
      plan_slug?: string;
      coupon?: string | null;
      coupon_code?: string | null;
      currency?: string | null;
    };
    const data = await billingService.createPlanOrder(userIdFrom(req), {
      planId: body.plan_id ?? null,
      planSlug: body.plan_slug ?? null,
      couponCode: body.coupon ?? body.coupon_code ?? null,
      currency: body.currency ?? null,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Verifies a plan payment and activates the subscription. It is idempotent for repeated client callbacks.
 */
export const verifyPlanOrderHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as {
      order_id: string | number;
      razorpay_payment_id: string;
      razorpay_order_id?: string | null;
      razorpay_signature: string;
    };
    const data = await billingService.verifyPlanOrder(userIdFrom(req), {
      orderKey: String(body.order_id),
      razorpayOrderId: body.razorpay_order_id ?? null,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Returns the user's available AI credits split into plan and purchased buckets. The nearest expiry helps the UI warn about expiring credits.
 */
export const getCreditBalanceHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const summary = await billingService.getCreditBalance(userIdFrom(req));
    res.status(200).json({
      success: true,
      data: {
        balance: summary.total,
        planCredits: summary.planCredits,
        purchasedCredits: summary.purchasedCredits,
        planCreditsTotal: summary.planCreditsTotal,
        purchasedCreditsTotal: summary.purchasedCreditsTotal,
        nearestExpiry: summary.nearestExpiry?.toISOString() ?? null,
      },
    });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Returns a bounded page of the user's billing orders. The limit query parameter is clamped to a safe range.
 */
export const listTransactionsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requested = Number(req.query.limit);
    const limit = Number.isFinite(requested)
      ? Math.min(100, Math.max(1, Math.trunc(requested)))
      : 50;
    const data = await billingService.listOrders(userIdFrom(req), limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Returns a bounded, newest-first page of the user's credit ledger along with
 * all-time AI spend totals. `type=spent|added` filters entries by direction.
 */
export const listCreditTransactionsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
      : 25;
    const requestedOffset = Number(req.query.offset);
    const offset = Number.isFinite(requestedOffset)
      ? Math.max(0, Math.trunc(requestedOffset))
      : 0;
    const rawType = typeof req.query.type === "string" ? req.query.type : "";
    const filter =
      rawType === "spent" || rawType === "added" ? rawType : null;
    const data = await billingService.listCreditTransactions(
      userIdFrom(req),
      { limit, offset, filter }
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Returns the current status of one user-owned order. This supports polling after checkout while webhooks settle.
 */
export const getOrderHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await billingService.getOrder(userIdFrom(req), req.params.orderId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendBillingError(res, error);
  }
};

/**
 * Verifies and processes a Razorpay webhook using the captured raw body. The route is public but every event must carry a valid signature.
 */
export const razorpayWebhookHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawBody = (req as RawBodyRequest).rawBody;
    if (!rawBody) {
      res.status(400).json({
        success: false,
        code: "INVALID_WEBHOOK",
        message: "Raw webhook body is unavailable.",
      });
      return;
    }

    const result = await billingService.processWebhook({
      rawBody,
      signature: headerValue(req.headers["x-razorpay-signature"]),
      eventId: headerValue(req.headers["x-razorpay-event-id"]),
      body: req.body,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendBillingError(res, error);
  }
};
