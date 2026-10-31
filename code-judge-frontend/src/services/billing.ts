import apiClient from "@/lib/axios";
import type {
  RazorpayCheckoutOrder,
  RazorpayPaymentPayload,
} from "@/services/aiCredits";

export interface PlanCheckoutOrder extends RazorpayCheckoutOrder {
  planId: number;
  planSlug: string;
  planName: string;
}

export interface BundleCheckoutOrder extends RazorpayCheckoutOrder {
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
  validityDays: number;
}

export interface SuggestedPlan {
  id: number;
  slug: string;
  name: string;
  pricePaise: number;
  credits: number;
  validityDays: number;
  currency: string;
}

export interface SuggestedPack {
  id: number;
  code: string;
  name: string;
  priceInr: number;
  pricePaise: number;
  credits: number;
  validityDays: number;
}

export interface PlanBundleSuggestion {
  kind: "plan_bundle";
  suggestionType: "A";
  productId: string;
  bundleId: number;
  sourceProductId: string;
  title: string;
  description: string;
  badge: string;
  amountPaise: number;
  compareAtPaise: number;
  savingsPaise: number;
  credits: number;
  planCredits: number;
  packCredits: number;
  perCreditPaise: number;
  plan: SuggestedPlan;
  pack: SuggestedPack;
}

export interface PackUpgradeSuggestion {
  kind: "pack_upgrade";
  suggestionType: "B";
  productId: string;
  sourceProductId: string;
  title: string;
  description: string;
  badge: string;
  amountPaise: number;
  comparedAmountPaise: number;
  priceDifferencePaise: number;
  extraCredits: number;
  creditMultiplier: number;
  credits: number;
  perCreditPaise: number;
  sourcePack: SuggestedPack;
  pack: SuggestedPack;
}

export type CheckoutSuggestion = PlanBundleSuggestion | PackUpgradeSuggestion;

export interface CheckoutSuggestionResponse {
  suggestion: CheckoutSuggestion | null;
  planCode: string | null;
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

export interface VerifiedPlanPurchase {
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

export type BillingOrderType = "credit_pack" | "plan" | "bundle";
export type BillingOrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export interface BillingTransaction {
  orderId: string;
  orderNo: string;
  orderType: BillingOrderType;
  status: BillingOrderStatus;
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
  paymentMethod?: string | null;
  gatewayPaymentId?: string | null;
}

export interface InvoiceLineItem {
  name: string;
  description: string;
  quantity: number;
  unitPaise: number;
  amountPaise: number;
}

export interface InvoiceData {
  invoiceNo: string;
  documentTitle: "INVOICE" | "TAX INVOICE";
  kind: BillingOrderType;
  kindLabel: string;
  status: string;
  statusLabel: string;
  invoiceDate: string;
  paidAt: string | null;
  orderId: string;
  orderNo: string;
  transactionId: string | null;
  paymentMethod: string | null;
  currency: string;
  billedTo: { name: string; email: string };
  seller: { name: string; lines: string[]; gstin: string | null; email: string };
  items: InvoiceLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  discountLabel: string | null;
  taxablePaise: number;
  gstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
  gstRegistered: boolean;
  gstRatePercent: number;
  grant: { title: string; description: string };
  planName: string | null;
  packName: string | null;
  credits: number;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface BillingConfig {
  configured: boolean;
  keyId: string | null;
}

export async function getBillingConfig(): Promise<BillingConfig> {
  const response = await apiClient.get<BillingConfig>("/v1/billing/config");
  return response.data;
}

export async function createPlanOrder(input: {
  planId?: number;
  planSlug?: string;
  coupon?: string;
}): Promise<PlanCheckoutOrder> {
  const response = await apiClient.post<PlanCheckoutOrder>(
    "/v1/billing/plans/orders",
    {
      ...(input.planId ? { plan_id: input.planId } : {}),
      ...(input.planSlug ? { plan_slug: input.planSlug } : {}),
      ...(input.coupon ? { coupon: input.coupon } : {}),
    }
  );
  return response.data;
}

export async function createBundleOrder(input: {
  bundleId: number;
  coupon?: string;
}): Promise<BundleCheckoutOrder> {
  const response = await apiClient.post<BundleCheckoutOrder>(
    "/v1/billing/bundles/orders",
    {
      bundle_id: input.bundleId,
      ...(input.coupon ? { coupon: input.coupon } : {}),
    }
  );
  return response.data;
}

export async function verifyBundlePayment(
  order: BundleCheckoutOrder,
  payment: RazorpayPaymentPayload
): Promise<VerifiedBundlePurchase> {
  const response = await apiClient.post<VerifiedBundlePurchase>(
    "/v1/billing/bundles/verify",
    {
      order_id: order.orderId,
      razorpay_payment_id: payment.razorpayPaymentId,
      razorpay_order_id: payment.razorpayOrderId,
      razorpay_signature: payment.razorpaySignature,
    }
  );
  return response.data;
}

export async function getCheckoutSuggestion(input: {
  planId?: number;
  planSlug?: string;
  packId?: string;
}): Promise<CheckoutSuggestionResponse> {
  const response = await apiClient.get<CheckoutSuggestionResponse>(
    "/v1/billing/suggestions",
    {
      params: {
        ...(input.planId ? { plan_id: input.planId } : {}),
        ...(input.planSlug ? { plan_slug: input.planSlug } : {}),
        ...(input.packId ? { pack_id: input.packId } : {}),
      },
    }
  );
  return response.data;
}

export async function verifyPlanPayment(
  order: PlanCheckoutOrder,
  payment: RazorpayPaymentPayload
): Promise<VerifiedPlanPurchase> {
  const response = await apiClient.post<VerifiedPlanPurchase>(
    "/v1/billing/plans/verify",
    {
      order_id: order.orderId,
      razorpay_payment_id: payment.razorpayPaymentId,
      razorpay_order_id: payment.razorpayOrderId,
      razorpay_signature: payment.razorpaySignature,
    }
  );
  return response.data;
}

export async function getBillingTransactions(
  limit = 50
): Promise<BillingTransaction[]> {
  const response = await apiClient.get<BillingTransaction[]>(
    "/v1/billing/transactions",
    { params: { limit } }
  );
  return response.data;
}

export async function getInvoice(orderId: string): Promise<InvoiceData> {
  const response = await apiClient.get<InvoiceData>(
    `/v1/billing/orders/${encodeURIComponent(orderId)}/invoice`
  );
  return response.data;
}

export async function downloadInvoicePdf(orderId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/v1/billing/orders/${encodeURIComponent(orderId)}/invoice/pdf`,
    { responseType: "blob" }
  );
  return response.data;
}

export async function emailInvoice(
  orderId: string
): Promise<{ sent: boolean; email: string; invoiceNo: string }> {
  const response = await apiClient.post<{
    sent: boolean;
    email: string;
    invoiceNo: string;
  }>(`/v1/billing/orders/${encodeURIComponent(orderId)}/invoice/email`);
  return response.data;
}

export type TrialRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TrialEligibilityReason =
  | "eligible"
  | "pending"
  | "active_trial"
  | "active_plan"
  | "trial_used"
  | "unavailable";

export interface TrialRequestSummary {
  id: number;
  status: TrialRequestStatus;
  requestNote: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  creditsGranted: number;
}

export interface TrialPlanSummary {
  id: number;
  name: string;
  slug: string;
  trialDays: number;
  credits: number;
}

export interface TrialStatus {
  eligible: boolean;
  reason: TrialEligibilityReason;
  plan: TrialPlanSummary | null;
  activeTrialEndsAt: string | null;
  latestRequest: TrialRequestSummary | null;
}

/** GET /api/v1/billing/trial — current eligibility and request state. */
export async function getTrialStatus(): Promise<TrialStatus> {
  const response = await apiClient.get<TrialStatus>("/v1/billing/trial");
  return response.data;
}

/** POST /api/v1/billing/trial/request — submit a Basic trial request. */
export async function requestBasicTrial(note?: string): Promise<TrialRequestSummary> {
  const response = await apiClient.post<{ request: TrialRequestSummary }>(
    "/v1/billing/trial/request",
    { note: note?.trim() || null }
  );
  return response.data.request;
}
