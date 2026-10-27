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

export type BillingOrderType = "credit_pack" | "plan";
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
