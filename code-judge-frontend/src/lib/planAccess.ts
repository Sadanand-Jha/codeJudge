import type { MySubscription } from "@/services/user";

export type HeaderPlan = Pick<MySubscription, "isPaid"> | null | undefined;

/** Custom paper headers are included with every paid plan. */
export function canUseCustomHeader(subscription: HeaderPlan): boolean {
  return subscription?.isPaid === true;
}

export type ProfilePhotoPlan = Pick<MySubscription, "isPaid" | "status"> | null | undefined;

/** Custom profile photos require an active paid plan or an active trial. */
export function canChangeProfilePhoto(subscription: ProfilePhotoPlan): boolean {
  if (!subscription?.isPaid) return false;
  return subscription.status === "active" || subscription.status === "trialing";
}
