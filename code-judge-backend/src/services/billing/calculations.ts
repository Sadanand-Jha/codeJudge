// Pure billing calculations kept separate from database/gateway I/O so they
// are easy to unit test.

import { randomBytes } from "node:crypto";

export const DAY_MS = 86_400_000;
export const MIN_RAZORPAY_AMOUNT_PAISE = 100;
export const LIFETIME_DAYS = 36_500;

export type BillingPeriod =
  | "monthly"
  | "quarterly"
  | "yearly"
  | "lifetime"
  | "custom_days";

/**
 * Returns a new Date shifted by a whole number of days. Billing validity is calculated in UTC milliseconds so day lengths stay consistent.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Maps a plan billing period to its access duration. Monthly, quarterly, yearly, lifetime, and custom-day prices each resolve to an explicit number of days.
 */
export function validityDaysForPeriod(
  period: BillingPeriod,
  customDays: number | null
): number {
  switch (period) {
    case "quarterly":
      return 90;
    case "yearly":
      return 365;
    case "lifetime":
      return LIFETIME_DAYS;
    case "custom_days":
      return customDays && customDays > 0 ? customDays : 30;
    case "monthly":
    default:
      return 30;
  }
}

/**
 * Generates a human-readable, date-prefixed order number. The random suffix keeps the receipt friendly while avoiding collisions across concurrent checkouts.
 */
export function orderNumber(now = new Date()): string {
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `QS-${stamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Calculates the coupon discount in paise without ever exceeding the selling price. Percent coupons round to the nearest paise, flat coupons cap at the price, and free-day coupons do not reduce money.
 */
export function computeCouponDiscount(input: {
  type: "percent" | "flat" | "free_days";
  value: number;
  amountPaise: number;
}): number {
  const amount = Math.max(0, Math.trunc(input.amountPaise));
  if (amount === 0) return 0;

  if (input.type === "percent") {
    const percent = Math.min(100, Math.max(0, input.value));
    return Math.min(amount, Math.round((amount * percent) / 100));
  }
  if (input.type === "flat") {
    return Math.min(amount, Math.max(0, Math.trunc(input.value)));
  }
  return 0;
}

/**
 * Checks whether a coupon's plan allowlist permits the selected item. An empty or missing allowlist means the coupon applies to everything.
 */
export function couponAppliesToPlan(
  appliesToPlanIds: number[] | null | undefined,
  planId: number | null
): boolean {
  if (!Array.isArray(appliesToPlanIds) || appliesToPlanIds.length === 0) {
    return true;
  }
  if (planId === null) return false;
  return appliesToPlanIds.includes(planId);
}

export interface CurrentSubscriptionPlacement {
  id: number;
  planId: number;
  status: string;
  isDefaultFree: boolean;
  currentPeriodEnd: Date | null;
}

export interface SubscriptionPlacement {
  /** Same plan + unexpired period: move the existing period forward. */
  useExisting: boolean;
  /** A different active plan is cancelled immediately before the new one. */
  cancelCurrent: boolean;
  startsAt: Date;
  expiresAt: Date;
}

/**
 * Decide how a purchased plan relates to the user's current subscription.
 *
 * - Trial / free / open-ended same plan -> convert to a paid period now.
 * - Active same plan -> queue the new period after the current end.
 * - Different plan -> end the old plan now and start the new one now.
 * - Nothing active -> start now.
 */
export function computeSubscriptionPlacement(input: {
  current: CurrentSubscriptionPlacement | null;
  planId: number;
  now: Date;
  validityDays: number;
}): SubscriptionPlacement {
  const { current, planId, now, validityDays } = input;
  const days = Math.max(1, validityDays);

  if (current && current.planId === planId) {
    const convertNow =
      current.status === "trialing" ||
      current.isDefaultFree ||
      current.currentPeriodEnd === null;
    const startsAt =
      convertNow || current.currentPeriodEnd!.getTime() <= now.getTime()
        ? now
        : current.currentPeriodEnd!;
    return {
      useExisting: true,
      cancelCurrent: false,
      startsAt,
      expiresAt: addDays(startsAt, days),
    };
  }

  return {
    useExisting: false,
    cancelCurrent: Boolean(current),
    startsAt: now,
    expiresAt: addDays(now, days),
  };
}
