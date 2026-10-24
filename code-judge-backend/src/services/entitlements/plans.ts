import type {
  BadgeTier,
  CreditAllocationResult,
  CreditOrder,
  MonthlyPlan,
  PlanOrder,
  PlanPlacement,
} from "./types.ts";

export const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysLeftUntil(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
}

export function isOrderActive(order: PlanOrder, now: Date): boolean {
  return (
    order.isActive &&
    order.status === "paid" &&
    order.startsAt.getTime() <= now.getTime() &&
    order.expiresAt.getTime() > now.getTime()
  );
}

export function selectActivePlanOrder(
  orders: PlanOrder[],
  now: Date
): PlanOrder | null {
  const active = orders.filter((order) => isOrderActive(order, now));
  if (active.length === 0) return null;

  return active.sort((a, b) => {
    if (b.plan.tierRank !== a.plan.tierRank) {
      return b.plan.tierRank - a.plan.tierRank;
    }
    const expiryDiff = b.expiresAt.getTime() - a.expiresAt.getTime();
    if (expiryDiff !== 0) return expiryDiff;
    return b.id - a.id;
  })[0];
}

export function computePlanPlacement(input: {
  currentOrder: PlanOrder | null;
  nextPlan: MonthlyPlan;
  now: Date;
  validityDays: number;
}): PlanPlacement {
  const { currentOrder, nextPlan, now, validityDays } = input;
  const currentActive = currentOrder ? isOrderActive(currentOrder, now) : false;

  if (!currentActive || !currentOrder) {
    return {
      startsAt: now,
      expiresAt: addDays(now, validityDays),
      deactivatePrevious: false,
      changeType: "new",
    };
  }

  if (nextPlan.tierRank > currentOrder.plan.tierRank) {
    return {
      startsAt: now,
      expiresAt: addDays(now, validityDays),
      deactivatePrevious: true,
      changeType: "upgrade",
    };
  }

  const startsAt = currentOrder.expiresAt;
  return {
    startsAt,
    expiresAt: addDays(startsAt, validityDays),
    deactivatePrevious: false,
    changeType:
      nextPlan.tierRank === currentOrder.plan.tierRank ? "renewal" : "downgrade",
  };
}

export function allocateCredits(
  orders: CreditOrder[],
  amount: number
): CreditAllocationResult {
  const available = orders.reduce((sum, order) => sum + Math.max(0, order.remaining), 0);
  if (amount <= 0) {
    return { allocations: [], remaining: Math.max(0, amount), available };
  }

  const ordered = [...orders]
    .filter((order) => order.remaining > 0)
    .sort((a, b) => {
      const expiryDiff = a.expiresAt.getTime() - b.expiresAt.getTime();
      if (expiryDiff !== 0) return expiryDiff;
      return a.id - b.id;
    });

  const allocations: Array<{ orderId: number; amount: number }> = [];
  let remaining = amount;

  for (const order of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(order.remaining, remaining);
    if (take <= 0) continue;
    allocations.push({ orderId: order.id, amount: take });
    remaining -= take;
  }

  return { allocations, remaining, available };
}

export function badgeTierForPlan(plan: MonthlyPlan | null): BadgeTier {
  if (!plan || plan.tierRank <= 0) return "free";
  if (plan.tierRank >= 2) return "pro";
  return "basic";
}
