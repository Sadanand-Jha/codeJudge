import assert from "node:assert/strict";
import {
  addDays,
  computeCouponDiscount,
  computeSubscriptionPlacement,
  couponAppliesToPlan,
  orderNumber,
  validityDaysForPeriod,
} from "../services/billing/calculations.ts";
import {
  hmacSha256Hex,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../services/billing/signatures.ts";
import {
  buildPackUpgradeSuggestion,
  buildPlanBundleSuggestion,
} from "../services/billing/suggestions.ts";
import type {
  PurchasableCreditPack,
  PurchasablePlan,
  PurchasablePlanBundle,
} from "../repositories/billing.repository.ts";

// Discounts are computed server-side in paise and can never exceed the price.
assert.equal(
  computeCouponDiscount({ type: "percent", value: 10, amountPaise: 9_900 }),
  990
);
assert.equal(
  computeCouponDiscount({ type: "percent", value: 33, amountPaise: 199 }),
  66
);
assert.equal(
  computeCouponDiscount({ type: "flat", value: 5_000, amountPaise: 1_000 }),
  1_000
);
assert.equal(
  computeCouponDiscount({ type: "free_days", value: 7, amountPaise: 9_900 }),
  0
);

assert.equal(couponAppliesToPlan(null, 2), true);
assert.equal(couponAppliesToPlan([], 2), true);
assert.equal(couponAppliesToPlan([2, 3], 2), true);
assert.equal(couponAppliesToPlan([3], 2), false);
assert.equal(couponAppliesToPlan([2], null), false);

assert.equal(validityDaysForPeriod("monthly", null), 30);
assert.equal(validityDaysForPeriod("quarterly", null), 90);
assert.equal(validityDaysForPeriod("yearly", null), 365);
assert.equal(validityDaysForPeriod("custom_days", 45), 45);
assert.equal(validityDaysForPeriod("custom_days", null), 30);

const NOW = new Date("2026-10-26T10:00:00.000Z");

// Same plan while trialing converts to paid immediately.
const trial = computeSubscriptionPlacement({
  current: {
    id: 1,
    planId: 2,
    status: "trialing",
    isDefaultFree: false,
    currentPeriodEnd: addDays(NOW, 4),
  },
  planId: 2,
  now: NOW,
  validityDays: 30,
});
assert.equal(trial.useExisting, true);
assert.equal(trial.cancelCurrent, false);
assert.equal(trial.startsAt.toISOString(), NOW.toISOString());
assert.equal(trial.expiresAt.toISOString(), addDays(NOW, 30).toISOString());

// Renewing an active plan queues the new period after the current end.
const renewal = computeSubscriptionPlacement({
  current: {
    id: 2,
    planId: 2,
    status: "active",
    isDefaultFree: false,
    currentPeriodEnd: addDays(NOW, 10),
  },
  planId: 2,
  now: NOW,
  validityDays: 30,
});
assert.equal(renewal.useExisting, true);
assert.equal(renewal.startsAt.toISOString(), addDays(NOW, 10).toISOString());
assert.equal(renewal.expiresAt.toISOString(), addDays(NOW, 40).toISOString());

// Switching plans ends the free subscription immediately and starts now.
const upgrade = computeSubscriptionPlacement({
  current: {
    id: 3,
    planId: 1,
    status: "active",
    isDefaultFree: true,
    currentPeriodEnd: null,
  },
  planId: 2,
  now: NOW,
  validityDays: 30,
});
assert.equal(upgrade.useExisting, false);
assert.equal(upgrade.cancelCurrent, true);
assert.equal(upgrade.startsAt.toISOString(), NOW.toISOString());

// No subscription starts a brand-new period.
const fresh = computeSubscriptionPlacement({
  current: null,
  planId: 3,
  now: NOW,
  validityDays: 90,
});
assert.equal(fresh.useExisting, false);
assert.equal(fresh.cancelCurrent, false);
assert.equal(fresh.expiresAt.toISOString(), addDays(NOW, 90).toISOString());

const first = orderNumber(new Date("2026-10-26T00:00:00.000Z"));
const second = orderNumber(new Date("2026-10-26T00:00:00.000Z"));
assert.match(first, /^QS-20261026-[0-9A-F]{6}$/);
assert.notEqual(first, second);

const paymentSignature = hmacSha256Hex(
  "secret_key",
  "order_ABC123|pay_XYZ789"
);
assert.equal(
  verifyPaymentSignature({
    keySecret: "secret_key",
    orderId: "order_ABC123",
    paymentId: "pay_XYZ789",
    signature: paymentSignature,
  }),
  true
);
assert.equal(
  verifyPaymentSignature({
    keySecret: "secret_key",
    orderId: "order_ABC123",
    paymentId: "pay_XYZ789",
    signature: `${paymentSignature.slice(0, -1)}0`,
  }),
  false
);
assert.equal(
  verifyPaymentSignature({
    keySecret: "wrong_secret",
    orderId: "order_ABC123",
    paymentId: "pay_XYZ789",
    signature: paymentSignature,
  }),
  false
);

const rawBody = Buffer.from('{"event":"payment.captured"}');
const webhookSignature = hmacSha256Hex("webhook_secret", rawBody);
assert.equal(
  verifyWebhookSignature({
    webhookSecret: "webhook_secret",
    rawBody,
    signature: webhookSignature,
  }),
  true
);
// A re-serialized JSON body must not verify (this is why raw bytes are kept).
assert.equal(
  verifyWebhookSignature({
    webhookSecret: "webhook_secret",
    rawBody: Buffer.from('{"event": "payment.captured"}'),
    signature: webhookSignature,
  }),
  false
);

// Checkout upsells are entirely server-computed. These pure-function cases
// cover the ₹99 → ₹199 pack upsell and the plan + pack bundle.
const basicPack: PurchasableCreditPack = {
  id: 1,
  code: "teacher",
  name: "Teacher Pack",
  priceInr: 99,
  credits: 50,
  validityDays: 180,
  description: null,
  isPopular: false,
};
const masterPack: PurchasableCreditPack = {
  id: 2,
  code: "master",
  name: "Master Pack",
  priceInr: 199,
  credits: 125,
  validityDays: 180,
  description: null,
  isPopular: true,
};

const packSuggestion = buildPackUpgradeSuggestion({
  selectedPack: basicPack,
  packs: [basicPack, masterPack],
});
assert.ok(packSuggestion);
assert.equal(packSuggestion.suggestionType, "B");
assert.equal(packSuggestion.productId, "pack:master");
assert.equal(packSuggestion.amountPaise, 19_900);
assert.equal(packSuggestion.extraCredits, 75);
assert.equal(packSuggestion.creditMultiplier, 2.5);
assert.equal(packSuggestion.priceDifferencePaise, 10_000);
assert.ok(
  packSuggestion.perCreditPaise < (basicPack.priceInr * 100) / basicPack.credits
);
assert.equal(
  buildPackUpgradeSuggestion({
    selectedPack: basicPack,
    packs: [basicPack, masterPack],
    highestOwnedPackPriceInr: 199,
  }),
  null
);
assert.equal(
  buildPackUpgradeSuggestion({ selectedPack: masterPack, packs: [basicPack, masterPack] }),
  null
);

const plan: PurchasablePlan = {
  planId: 2,
  slug: "pro",
  name: "Pro",
  description: null,
  trialDays: 0,
  isDefaultFree: false,
  priceId: 20,
  billingPeriod: "monthly",
  customDays: null,
  amountPaise: 19_900,
  mrpAmountPaise: 29_900,
  currency: "INR",
  taxInclusive: true,
  credits: 100,
};
const bundle: PurchasablePlanBundle = {
  id: 7,
  planId: plan.planId,
  packId: basicPack.id,
  name: "Pro + 50 AI credits",
  description: null,
  badge: "Best value",
  amountPaise: 26_820,
  mrpPaise: 29_800,
  sortOrder: 0,
  plan,
  pack: basicPack,
};
const bundleSuggestion = buildPlanBundleSuggestion({
  bundle,
  hasActivePlan: false,
});
assert.ok(bundleSuggestion);
assert.equal(bundleSuggestion.suggestionType, "A");
assert.equal(bundleSuggestion.productId, "bundle:7");
assert.equal(bundleSuggestion.amountPaise, 26_820);
assert.equal(bundleSuggestion.compareAtPaise, 29_800);
assert.equal(bundleSuggestion.savingsPaise, 2_980);
assert.equal(bundleSuggestion.credits, 150);
assert.equal(bundleSuggestion.plan.validityDays, 30);
assert.equal(
  buildPlanBundleSuggestion({ bundle, hasActivePlan: true }),
  null
);
assert.equal(
  buildPlanBundleSuggestion({
    bundle: { ...bundle, amountPaise: 29_800 },
    hasActivePlan: false,
  }),
  null
);

console.log("billing.test.ts: all assertions passed");
