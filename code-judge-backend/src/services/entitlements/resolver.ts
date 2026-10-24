import {
  addDays,
  badgeTierForPlan,
  daysLeftUntil,
  isOrderActive,
} from "./plans.ts";
import type {
  Entitlements,
  EntitlementSnapshot,
  MonthlyPlan,
  PlanStatus,
} from "./types.ts";

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function planLimits(plan: MonthlyPlan | null) {
  return {
    quizzes: plan?.quizzesPerMonth ?? 0,
    rooms: plan?.roomsLimit ?? 0,
    membersPerRoom: plan?.membersPerRoom ?? 0,
    aiCredits: plan?.aiCreditsPerMonth ?? 0,
    emailsPerDay: plan?.emailsPerDay ?? 0,
  };
}

export function resolveEntitlements(snapshot: EntitlementSnapshot): Entitlements {
  const now = snapshot.now;
  const freePlan = snapshot.freePlan;
  const trialStartedAt = snapshot.trialStartedAt ?? snapshot.createdAt ?? now;
  const trialEndsAt = addDays(trialStartedAt, freePlan?.trialDays ?? 0);

  const activeOrder =
    snapshot.activePlanOrder && isOrderActive(snapshot.activePlanOrder, now)
      ? snapshot.activePlanOrder
      : null;

  let status: PlanStatus;
  let plan: MonthlyPlan | null;
  let startsAt: Date;
  let expiresAt: Date;
  let limitsPlan: MonthlyPlan | null;

  if (activeOrder && activeOrder.plan.isActive) {
    const days = daysLeftUntil(activeOrder.expiresAt, now);
    status = days <= 3 ? "expiring" : "active";
    plan = activeOrder.plan;
    startsAt = activeOrder.startsAt;
    expiresAt = activeOrder.expiresAt;
    limitsPlan = activeOrder.plan;
  } else if (activeOrder) {
    status = "expired";
    plan = activeOrder.plan;
    startsAt = activeOrder.startsAt;
    expiresAt = activeOrder.expiresAt;
    limitsPlan = freePlan;
  } else {
    plan = freePlan;
    startsAt = trialStartedAt;
    expiresAt = trialEndsAt;
    status = now.getTime() < trialEndsAt.getTime() ? "trial" : "expired";
    limitsPlan = freePlan;
  }

  const limits = planLimits(limitsPlan);
  const quizzesRemaining =
    limits.quizzes < 0
      ? -1
      : Math.max(0, limits.quizzes - snapshot.quizzesUsed);
  const emailsRemainingToday =
    limits.emailsPerDay < 0
      ? -1
      : Math.max(0, limits.emailsPerDay - snapshot.emailsToday);

  const features =
    status === "expired"
      ? { leaderboard: false, customBranding: false, removeWatermark: false }
      : {
          leaderboard: plan?.analyticsLevel === "score_leaderboard",
          customBranding: plan?.customBranding === true,
          removeWatermark: plan?.removeWatermark === true,
        };

  const badgeTier = badgeTierForPlan(plan);
  const daysLeft = status === "expired" ? 0 : daysLeftUntil(expiresAt, now);

  return {
    userId: snapshot.userId,
    plan: {
      id: plan?.id ?? null,
      code: plan?.code ?? "free",
      name: plan?.name ?? "Free",
      status,
      startsAt: iso(startsAt),
      expiresAt: iso(expiresAt),
      daysLeft,
    },
    limits,
    usage: {
      quizzesUsed: snapshot.quizzesUsed,
      quizzesRemaining,
      emailsToday: snapshot.emailsToday,
      emailsRemainingToday,
      aiCreditsRemaining: snapshot.credits.totalRemaining,
      creditsExpiringSoon: snapshot.credits.nearestExpiry
        ? {
            amount: snapshot.credits.nearestExpiry.amount,
            at: snapshot.credits.nearestExpiry.at.toISOString(),
          }
        : null,
    },
    features,
    badge: {
      tier: badgeTier,
      state:
        status === "trial"
          ? "trial"
          : status === "expiring"
            ? "expiring"
            : status === "expired"
              ? "expired"
              : "default",
      label: plan?.name ?? "Free",
    },
    isPaid: badgeTier !== "free" && (status === "active" || status === "expiring"),
    computedAt: now.toISOString(),
  };
}
