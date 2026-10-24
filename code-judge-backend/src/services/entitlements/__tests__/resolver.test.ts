import assert from "node:assert/strict";
import {
  addDays,
  allocateCredits,
  computePlanPlacement,
  selectActivePlanOrder,
} from "../plans.ts";
import { resolveEntitlements } from "../resolver.ts";
import type {
  CreditOrder,
  EntitlementSnapshot,
  MonthlyPlan,
  PlanOrder,
} from "../types.ts";

const NOW = new Date("2026-10-24T10:00:00.000Z");

function plan(overrides: Partial<MonthlyPlan> = {}): MonthlyPlan {
  return {
    id: 1,
    code: "free",
    name: "Free",
    priceInr: 0,
    mrpInr: 0,
    trialDays: 7,
    quizzesPerMonth: 1,
    roomsLimit: 1,
    membersPerRoom: 20,
    aiCreditsPerMonth: 0,
    emailsPerDay: 0,
    analyticsLevel: "basic_score",
    customBranding: false,
    removeWatermark: false,
    tierRank: 0,
    validityDays: 30,
    isActive: true,
    ...overrides,
  };
}

function order(overrides: Partial<PlanOrder> = {}): PlanOrder {
  const basePlan = overrides.plan ?? plan();
  return {
    id: 1,
    userId: 42,
    planId: basePlan.id,
    startsAt: addDays(NOW, -5),
    expiresAt: addDays(NOW, 25),
    validityDays: 30,
    creditsTotal: basePlan.aiCreditsPerMonth,
    creditsUsed: 0,
    creditsRemaining: basePlan.aiCreditsPerMonth,
    isActive: true,
    status: "paid",
    createdAt: addDays(NOW, -5),
    plan: basePlan,
    ...overrides,
  };
}

function snapshot(overrides: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot {
  return {
    userId: 42,
    now: NOW,
    trialStartedAt: addDays(NOW, -2),
    createdAt: addDays(NOW, -2),
    freePlan: plan(),
    activePlanOrder: null,
    credits: { totalRemaining: 0, nearestExpiry: null },
    quizzesUsed: 0,
    emailsToday: 0,
    ...overrides,
  };
}

let passed = 0;
function test(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const free = plan();
const basic = plan({
  id: 2,
  code: "basic",
  name: "Basic",
  priceInr: 99,
  mrpInr: 149,
  trialDays: 0,
  quizzesPerMonth: 20,
  roomsLimit: 5,
  membersPerRoom: 100,
  aiCreditsPerMonth: 20,
  emailsPerDay: 5,
  analyticsLevel: "score_leaderboard",
  tierRank: 1,
});
const pro = plan({
  id: 3,
  code: "pro",
  name: "Pro",
  priceInr: 199,
  mrpInr: 249,
  trialDays: 0,
  quizzesPerMonth: 30,
  roomsLimit: 5,
  membersPerRoom: 200,
  aiCreditsPerMonth: 50,
  emailsPerDay: 5,
  analyticsLevel: "score_leaderboard",
  customBranding: true,
  removeWatermark: true,
  tierRank: 2,
});

test("trial uses free-plan limits and trial status", () => {
  const result = resolveEntitlements(
    snapshot({ trialStartedAt: addDays(NOW, -2), quizzesUsed: 1 })
  );
  assert.equal(result.plan.code, "free");
  assert.equal(result.plan.status, "trial");
  assert.equal(result.plan.daysLeft, 5);
  assert.equal(result.badge.tier, "free");
  assert.equal(result.badge.state, "trial");
  assert.deepEqual(result.limits, {
    quizzes: 1,
    rooms: 1,
    membersPerRoom: 20,
    aiCredits: 0,
    emailsPerDay: 0,
  });
  assert.equal(result.usage.quizzesRemaining, 0);
  assert.equal(result.features.leaderboard, false);
  assert.equal(result.isPaid, false);
});

test("trial expiry becomes expired but keeps data readable", () => {
  const result = resolveEntitlements(
    snapshot({ trialStartedAt: addDays(NOW, -30), quizzesUsed: 1 })
  );
  assert.equal(result.plan.status, "expired");
  assert.equal(result.badge.state, "expired");
  assert.equal(result.plan.daysLeft, 0);
  assert.equal(result.features.leaderboard, false);
  assert.equal(result.usage.quizzesUsed, 1);
});

test("active Basic resolves DB limits and leaderboard", () => {
  const active = order({ id: 10, planId: basic.id, plan: basic });
  const result = resolveEntitlements(
    snapshot({ activePlanOrder: active, quizzesUsed: 4, emailsToday: 2 })
  );
  assert.equal(result.plan.code, "basic");
  assert.equal(result.plan.status, "active");
  assert.equal(result.badge.tier, "basic");
  assert.equal(result.badge.state, "default");
  assert.deepEqual(result.limits, {
    quizzes: 20,
    rooms: 5,
    membersPerRoom: 100,
    aiCredits: 20,
    emailsPerDay: 5,
  });
  assert.equal(result.usage.quizzesRemaining, 16);
  assert.equal(result.usage.emailsRemainingToday, 3);
  assert.equal(result.features.leaderboard, true);
  assert.equal(result.features.customBranding, false);
  assert.equal(result.features.removeWatermark, false);
  assert.equal(result.isPaid, true);
});

test("Pro inside three days is expiring and keeps Pro features", () => {
  const active = order({
    id: 11,
    planId: pro.id,
    plan: pro,
    expiresAt: addDays(NOW, 2),
  });
  const result = resolveEntitlements(snapshot({ activePlanOrder: active }));
  assert.equal(result.plan.status, "expiring");
  assert.equal(result.plan.daysLeft, 2);
  assert.equal(result.badge.tier, "pro");
  assert.equal(result.badge.state, "expiring");
  assert.equal(result.features.removeWatermark, true);
  assert.equal(result.features.customBranding, true);
});

test("inactive plan rows fail safe to expired", () => {
  const inactivePro = { ...pro, isActive: false };
  const active = order({ id: 12, planId: pro.id, plan: inactivePro });
  const result = resolveEntitlements(snapshot({ activePlanOrder: active }));
  assert.equal(result.plan.status, "expired");
  assert.equal(result.features.removeWatermark, false);
  assert.equal(result.limits.quizzes, free.quizzesPerMonth);
});

test("multiple active orders pick highest tier then latest expiry", () => {
  const basicLate = order({
    id: 1,
    planId: basic.id,
    plan: basic,
    expiresAt: addDays(NOW, 10),
  });
  const proEarly = order({
    id: 2,
    planId: pro.id,
    plan: pro,
    expiresAt: addDays(NOW, 5),
  });
  const proLate = order({
    id: 3,
    planId: pro.id,
    plan: pro,
    expiresAt: addDays(NOW, 20),
  });
  const future = order({
    id: 4,
    planId: pro.id,
    plan: pro,
    startsAt: addDays(NOW, 1),
    expiresAt: addDays(NOW, 40),
  });
  const selected = selectActivePlanOrder(
    [basicLate, proEarly, proLate, future],
    NOW
  );
  assert.equal(selected?.id, 3);
});

test("renewal of the same plan stacks at the current expiry", () => {
  const current = order({
    id: 20,
    planId: basic.id,
    plan: basic,
    expiresAt: addDays(NOW, 10),
  });
  const placement = computePlanPlacement({
    currentOrder: current,
    nextPlan: basic,
    now: NOW,
    validityDays: 30,
  });
  assert.equal(placement.changeType, "renewal");
  assert.equal(placement.startsAt.getTime(), current.expiresAt.getTime());
  assert.equal(placement.expiresAt.getTime(), addDays(current.expiresAt, 30).getTime());
  assert.equal(placement.deactivatePrevious, false);
});

test("upgrade starts immediately and deactivates the previous plan order", () => {
  const current = order({
    id: 21,
    planId: basic.id,
    plan: basic,
    expiresAt: addDays(NOW, 10),
  });
  const placement = computePlanPlacement({
    currentOrder: current,
    nextPlan: pro,
    now: NOW,
    validityDays: 30,
  });
  assert.equal(placement.changeType, "upgrade");
  assert.equal(placement.startsAt.getTime(), NOW.getTime());
  assert.equal(placement.expiresAt.getTime(), addDays(NOW, 30).getTime());
  assert.equal(placement.deactivatePrevious, true);
});

test("downgrade waits for the next renewal", () => {
  const current = order({
    id: 22,
    planId: pro.id,
    plan: pro,
    expiresAt: addDays(NOW, 10),
  });
  const placement = computePlanPlacement({
    currentOrder: current,
    nextPlan: basic,
    now: NOW,
    validityDays: 30,
  });
  assert.equal(placement.changeType, "downgrade");
  assert.equal(placement.startsAt.getTime(), current.expiresAt.getTime());
  assert.equal(placement.deactivatePrevious, false);
});

test("expired plan renews from now instead of the old expiry", () => {
  const current = order({
    id: 23,
    planId: basic.id,
    plan: basic,
    startsAt: addDays(NOW, -40),
    expiresAt: addDays(NOW, -10),
  });
  const placement = computePlanPlacement({
    currentOrder: current,
    nextPlan: basic,
    now: NOW,
    validityDays: 30,
  });
  assert.equal(placement.changeType, "new");
  assert.equal(placement.startsAt.getTime(), NOW.getTime());
});

test("credit allocation is FIFO by earliest expiry", () => {
  const credits: CreditOrder[] = [
    { id: 1, expiresAt: addDays(NOW, 30), remaining: 5 },
    { id: 2, expiresAt: addDays(NOW, 10), remaining: 3 },
    { id: 3, expiresAt: addDays(NOW, 20), remaining: 4 },
  ];
  const result = allocateCredits(credits, 7);
  assert.deepEqual(result.allocations, [
    { orderId: 2, amount: 3 },
    { orderId: 3, amount: 4 },
  ]);
  assert.equal(result.remaining, 0);
  assert.equal(result.available, 12);
});

test("credit allocation never overdraws and reports the shortfall", () => {
  const credits: CreditOrder[] = [
    { id: 1, expiresAt: addDays(NOW, 10), remaining: 3 },
    { id: 2, expiresAt: addDays(NOW, 20), remaining: 4 },
  ];
  const result = allocateCredits(credits, 20);
  assert.equal(result.allocations.reduce((sum, entry) => sum + entry.amount, 0), 7);
  assert.equal(result.remaining, 13);
  assert.equal(result.available, 7);
});

test("unlimited limits expose -1 remaining", () => {
  const unlimited = plan({
    id: 4,
    code: "pro",
    name: "Pro",
    quizzesPerMonth: -1,
    roomsLimit: -1,
    membersPerRoom: -1,
    emailsPerDay: -1,
    tierRank: 2,
  });
  const active = order({ id: 30, planId: unlimited.id, plan: unlimited });
  const result = resolveEntitlements(
    snapshot({ activePlanOrder: active, quizzesUsed: 999 })
  );
  assert.equal(result.usage.quizzesRemaining, -1);
  assert.equal(result.usage.emailsRemainingToday, -1);
});

test("nearest credit expiry is returned for the UI", () => {
  const result = resolveEntitlements(
    snapshot({
      credits: {
        totalRemaining: 12,
        nearestExpiry: { amount: 5, at: addDays(NOW, 3) },
      },
    })
  );
  assert.equal(result.usage.aiCreditsRemaining, 12);
  assert.deepEqual(result.usage.creditsExpiringSoon, {
    amount: 5,
    at: addDays(NOW, 3).toISOString(),
  });
});

console.log(`Entitlement resolver: ${passed} checks passed.`);
