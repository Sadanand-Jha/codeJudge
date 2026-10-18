import apiClient from "@/lib/axios";
import {
  AI_EFFORT_LEVELS,
  CREDIT_PURCHASE_PACKS,
  CREDIT_VALIDITY_MONTHS,
  type AIEffortLevel,
  type CreditPurchasePack,
} from "@/config/aiCredits";

export type { CreditPurchasePack, AIEffortLevel };

/* ------------------------------------------------------------------
   Read APIs — served from local billing configuration until the
   backend billing endpoints land. Components must use these getters
   (never import the config constants directly) so the swap to live
   backend values touches one file.
   ------------------------------------------------------------------ */

/** Credit packs available for one-time purchase, in display order. */
export function getPurchasePacks(): CreditPurchasePack[] {
  return CREDIT_PURCHASE_PACKS;
}

/** Effort levels with their per-paper credit charges. */
export function getEffortLevels(): AIEffortLevel[] {
  return AI_EFFORT_LEVELS;
}

/** How long purchased credits stay valid (months from purchase). */
export function getCreditValidityMonths(): number {
  return CREDIT_VALIDITY_MONTHS;
}

export interface PackOrderSummary {
  pack: CreditPurchasePack;
  /** Pack price in INR, GST-inclusive. */
  price: number;
  /** Total amount charged in INR. */
  total: number;
  credits: number;
}

/** Build the checkout summary for a pack. */
export function buildOrderSummary(packId: string): PackOrderSummary {
  const pack = CREDIT_PURCHASE_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error("Unknown credit pack.");
  return { pack, price: pack.price, total: pack.price, credits: pack.credits };
}

/* ------------------------------------------------------------------
   Purchase APIs — backend contracts (Razorpay, one-time purchases).
   Credits are granted only after server-side verification — the
   backend must treat `orderId` as the idempotency key so duplicate
   callbacks never double-grant.
   ------------------------------------------------------------------ */

export interface CreditOrder {
  /** Backend order id — idempotency key for verification. */
  orderId: string;
  /** Razorpay order id to open the checkout against. */
  razorpayOrderId: string;
  /** Amount in paise. */
  amountPaise: number;
  currency: string;
  packId: string;
  credits: number;
}

export interface RazorpayPaymentPayload {
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySignature: string;
}

export interface VerifiedCreditPurchase {
  transactionId: string;
  packId: string;
  credits: number;
  newBalance: number;
}

/**
 * Create a purchase order on the backend.
 * POST /api/v1/billing/credits/orders
 */
export async function createCreditOrder(
  packId: string,
  opts?: { coupon?: string; amountPaise?: number }
): Promise<CreditOrder> {
  const summary = buildOrderSummary(packId);
  const response = await apiClient.post<CreditOrder>("/v1/billing/credits/orders", {
    pack_id: summary.pack.id,
    amount_paise: opts?.amountPaise ?? summary.total * 100,
    currency: "INR",
    ...(opts?.coupon ? { coupon: opts.coupon } : {}),
  });
  return response.data;
}

/**
 * Verify a completed Razorpay payment on the backend.
 * POST /api/v1/billing/credits/verify
 */
export async function verifyCreditPayment(
  order: CreditOrder,
  payment: RazorpayPaymentPayload
): Promise<VerifiedCreditPurchase> {
  const response = await apiClient.post<VerifiedCreditPurchase>("/v1/billing/credits/verify", {
    order_id: order.orderId,
    pack_id: order.packId,
    razorpay_payment_id: payment.razorpayPaymentId,
    razorpay_order_id: payment.razorpayOrderId,
    razorpay_signature: payment.razorpaySignature,
  });
  return response.data;
}

/* ------------------------------------------------------------------
   Razorpay checkout loader (project's payment provider).
   ------------------------------------------------------------------ */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export interface RazorpayCheckoutOptions {
  key: string;
  order_id?: string;
  amount?: number;
  currency: string;
  name: string;
  description: string;
  theme?: { color?: string };
  prefill?: { email?: string; contact?: string; name?: string; method?: string; vpa?: string };
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment gateway failed to load. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

/**
 * Open the Razorpay checkout for a backend-created order.
 * Resolves with the signed payment payload, rejects on gateway
 * load failure. Dismissal is reported via `onDismiss`
 * (cancellation, not an error).
 */
export async function openRazorpayCheckout(args: {
  order: CreditOrder;
  itemName: string;
  prefill?: { email?: string; contact?: string; name?: string; method?: string; vpa?: string };
  notes?: Record<string, string>;
  onDismiss: () => void;
}): Promise<RazorpayPaymentPayload> {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error("Online payments are not configured yet. Please contact support.");
  }
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Payment gateway failed to load. Check your connection and try again.");
  }
  return new Promise((resolve) => {
    const checkout = new window.Razorpay!({
      key,
      order_id: args.order.razorpayOrderId,
      amount: args.order.amountPaise,
      currency: args.order.currency,
      name: "QuizSupport",
      description: args.itemName,
      theme: { color: "#6A3DF0" },
      prefill: args.prefill,
      notes: args.notes,
      handler: (response) =>
        resolve({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        }),
      modal: { ondismiss: args.onDismiss },
    });
    checkout.open();
  });
}
