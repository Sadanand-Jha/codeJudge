import type { MySubscription } from "@/services/user";

/** Plans that include the Pro-only custom letterhead feature. */
export const CUSTOM_HEADER_PLAN_SLUGS = new Set(["pro", "institute"]);

export type HeaderPlan = Pick<MySubscription, "isPaid" | "planSlug"> | null | undefined;

/** Single client-side gate for every custom-header action. */
export function canUseCustomHeader(subscription: HeaderPlan): boolean {
  if (!subscription?.isPaid) return false;
  return Boolean(subscription.planSlug && CUSTOM_HEADER_PLAN_SLUGS.has(subscription.planSlug));
}
