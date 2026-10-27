// Minimal Razorpay REST client. Using the documented HTTP API avoids pulling
// the SDK into a serverless bundle for four endpoints.

import axios from "axios";
import type { AxiosInstance } from "axios";
import type { RazorpayConfig } from "../../config/razorpay.ts";

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed" | string;
  order_id: string | null;
  method: string | null;
  captured: boolean;
  email?: string | null;
  contact?: string | null;
  error_description?: string | null;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
}

export interface RazorpayOrderPaymentList {
  entity: "collection";
  count: number;
  items: RazorpayPayment[];
}

export class RazorpayGatewayError extends Error {
  readonly statusCode: number | null;
  readonly gatewayCode: string | null;

  /**
   * Captures the gateway's message, HTTP status, and error code for logging and safe error mapping. The original request credentials are never included.
   */
  constructor(message: string, statusCode: number | null, gatewayCode: string | null) {
    super(message);
    this.name = "RazorpayGatewayError";
    this.statusCode = statusCode;
    this.gatewayCode = gatewayCode;
  }
}

/**
 * Converts an unknown Axios or network failure into a RazorpayGatewayError. It extracts the gateway description and status without leaking credentials.
 */
function gatewayMessage(error: unknown): RazorpayGatewayError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data = error.response?.data as
      | { error?: { description?: string; code?: string; reason?: string } }
      | undefined;
    const description =
      data?.error?.description ||
      data?.error?.reason ||
      error.message ||
      "Razorpay request failed";
    return new RazorpayGatewayError(description, status, data?.error?.code ?? null);
  }
  if (error instanceof Error) {
    return new RazorpayGatewayError(error.message, null, null);
  }
  return new RazorpayGatewayError("Razorpay request failed", null, null);
}

export class RazorpayClient {
  private readonly http: AxiosInstance;
  readonly keyId: string;

  /**
   * Creates an HTTP client with basic authentication and a bounded timeout. Credentials stay inside the client and are never exposed to callers.
   */
  constructor(config: RazorpayConfig) {
    this.keyId = config.keyId;
    this.http = axios.create({
      baseURL: config.apiBaseUrl,
      auth: { username: config.keyId, password: config.keySecret },
      timeout: 15_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  /**
   * Creates a Razorpay order for a server-computed amount. The local order number is used as the receipt, and notes carry the local order id for reconciliation.
   */
  async createOrder(input: {
    amountPaise: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<RazorpayOrder> {
    try {
      const response = await this.http.post<RazorpayOrder>("/orders", {
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
        payment_capture: 1,
      });
      return response.data;
    } catch (error) {
      throw gatewayMessage(error);
    }
  }

  /**
   * Fetches a payment directly from Razorpay. Verification uses this to confirm status, amount, currency, and order ownership instead of trusting the client.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    try {
      const response = await this.http.get<RazorpayPayment>(
        `/payments/${encodeURIComponent(paymentId)}`
      );
      return response.data;
    } catch (error) {
      throw gatewayMessage(error);
    }
  }

  /**
   * Lists payments attempted against a Razorpay order. This helps support reconcile an order whose webhook delivery or local update may have been interrupted.
   */
  async fetchOrderPayments(orderId: string): Promise<RazorpayOrderPaymentList> {
    try {
      const response = await this.http.get<RazorpayOrderPaymentList>(
        `/orders/${encodeURIComponent(orderId)}/payments`
      );
      return response.data;
    } catch (error) {
      throw gatewayMessage(error);
    }
  }
}

/**
 * Extracts a safe message from any gateway failure. Callers use it for logs and user-facing summaries without exposing request credentials.
 */
export function gatewayErrorMessage(error: unknown): string {
  if (error instanceof RazorpayGatewayError) return error.message;
  if (error instanceof Error) return error.message;
  return "Razorpay request failed";
}
