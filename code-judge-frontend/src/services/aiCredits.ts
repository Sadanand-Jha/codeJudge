import apiClient from "@/lib/axios";
import {
  AI_EFFORT_LEVELS,
  type AIEffortLevel,
  type CreditPurchasePack,
} from "@/config/aiCredits";

export type { CreditPurchasePack, AIEffortLevel };

/** Live credit balance returned by the billing endpoint. */
export interface CreditBalanceSnapshot {
  balance: number;
  planCredits: number;
  purchasedCredits: number;
  planCreditsTotal: number;
  purchasedCreditsTotal: number;
  nearestExpiry: string | null;
}

/** GET /api/v1/billing/credits/balance */
export async function getCreditBalance(): Promise<CreditBalanceSnapshot> {
  const response = await apiClient.get<CreditBalanceSnapshot>(
    "/v1/billing/credits/balance"
  );
  return response.data;
}

/* ------------------------------------------------------------------
   Read APIs — served from local billing configuration until the
   backend billing endpoints land. Components must use these getters
   (never import the config constants directly) so the swap to live
   backend values touches one file.
   ------------------------------------------------------------------ */

/** Effort levels with their per-paper credit charges. */
export function getEffortLevels(): AIEffortLevel[] {
  return AI_EFFORT_LEVELS;
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
export function buildOrderSummary(
  packId: string,
  packs: CreditPurchasePack[]
): PackOrderSummary {
  const pack = packs.find((p) => p.id === packId);
  if (!pack) throw new Error("Unknown credit pack.");
  return { pack, price: pack.price, total: pack.price, credits: pack.credits };
}

/* ------------------------------------------------------------------
   Purchase APIs — backend contracts (Razorpay, one-time purchases).
   Credits are granted only after server-side verification — the
   backend must treat `orderId` as the idempotency key so duplicate
   callbacks never double-grant.
   ------------------------------------------------------------------ */

export interface RazorpayCheckoutOrder {
  orderId: string;
  orderNo: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  credits: number;
  validityDays: number;
}

export interface CreditOrder extends RazorpayCheckoutOrder {
  packId: string;
}

export interface RazorpayPaymentPayload {
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySignature: string;
}

export interface VerifiedCreditPurchase {
  transactionId: string;
  orderId: string;
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
  opts: { coupon?: string; packs: CreditPurchasePack[] }
): Promise<CreditOrder> {
  const summary = buildOrderSummary(packId, opts.packs);
  const response = await apiClient.post<CreditOrder>("/v1/billing/credits/orders", {
    pack_id: summary.pack.id,
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

export class RazorpayCheckoutDismissedError extends Error {
  constructor() {
    super("Payment was cancelled.");
    this.name = "RazorpayCheckoutDismissedError";
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error("Payment gateway failed to load. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

/**
 * Open the Razorpay checkout for a backend-created order.
 * Resolves with the signed payment payload and rejects with
 * RazorpayCheckoutDismissedError when the user closes the modal.
 */
export async function openRazorpayCheckout(args: {
  order: RazorpayCheckoutOrder;
  itemName: string;
  prefill?: { email?: string; contact?: string; name?: string; method?: string; vpa?: string };
  notes?: Record<string, string>;
}): Promise<RazorpayPaymentPayload> {
  const key = args.order.keyId?.trim();
  if (!key) {
    throw new Error("Online payments are not configured yet. Please contact support.");
  }
  if (!args.order.razorpayOrderId) {
    throw new Error("This order is not ready for payment. Please try again.");
  }

  await loadRazorpayScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error("Payment gateway failed to load. Check your connection and try again.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let checkout: { open: () => void };

    try {
      checkout = new Razorpay({
        key,
        order_id: args.order.razorpayOrderId,
        amount: args.order.amountPaise,
        currency: args.order.currency,
        name: "QuizSupport",
        description: args.itemName,
        theme: { color: "#6A3DF0" },
        prefill: args.prefill,
        notes: args.notes,
        handler: (response) => {
          if (settled) return;
          settled = true;
          resolve({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            if (settled) return;
            settled = true;
            reject(new RazorpayCheckoutDismissedError());
          },
        },
      });
      checkout.open();
    } catch (error) {
      if (!settled) {
        settled = true;
        reject(
          error instanceof Error
            ? error
            : new Error("Payment gateway failed to open. Please try again.")
        );
      }
    }
  });
}
