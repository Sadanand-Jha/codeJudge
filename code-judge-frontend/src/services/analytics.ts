import apiClient from "@/lib/axios";

export type CheckoutEventName =
  | "suggestion_shown"
  | "suggestion_accepted"
  | "suggestion_declined"
  | "switch_back"
  | "purchase_completed";

const SESSION_KEY = "qs:checkout-session";

/** Stable per-tab id so anonymous impressions and purchases can be joined. */
export function checkoutSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "unavailable";
  }
}

/**
 * Fire-and-forget checkout funnel telemetry. It must never block or fail a
 * purchase, so all errors are swallowed after the request is dispatched.
 */
export function trackCheckoutEvent(input: {
  event: CheckoutEventName;
  suggestionType?: "A" | "B" | null;
  sourceProductId?: string | null;
  productId?: string | null;
  planCode?: string | null;
}): void {
  void apiClient
    .post("/v1/billing/events", {
      event: input.event,
      suggestion_type: input.suggestionType ?? null,
      source_product_id: input.sourceProductId ?? null,
      product_id: input.productId ?? null,
      plan_code: input.planCode ?? null,
      session_id: checkoutSessionId(),
    })
    .catch(() => {
      // Telemetry is best-effort by design.
    });
}
