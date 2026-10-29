import assert from "node:assert/strict";
import {
  creditExpiryDays,
  creditStateFromSnapshot,
  fuelSegments,
  normalizeCreditSnapshot,
  normalizeCredits,
} from "../creditState";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

test("credits normalize to safe non-negative integers", () => {
  assert.equal(normalizeCredits(42), 42);
  assert.equal(normalizeCredits(3.8), 3);
  assert.equal(normalizeCredits(-12), 0);
  assert.equal(normalizeCredits(Number.NaN), 0);
  assert.equal(normalizeCredits(undefined), 0);
});

test("warning state stays unknown until a snapshot exists", () => {
  assert.equal(
    creditStateFromSnapshot({ balance: 0, status: "loading", hasSnapshot: false }),
    "unknown"
  );
  assert.equal(
    creditStateFromSnapshot({ balance: 0, status: "error", hasSnapshot: false }),
    "unknown"
  );
  assert.equal(
    creditStateFromSnapshot({ balance: null, status: "ready", hasSnapshot: true }),
    "unknown"
  );
  assert.equal(
    creditStateFromSnapshot({ balance: 0, status: "error", hasSnapshot: true }),
    "empty",
    "a cached snapshot still drives the theme when refresh fails"
  );
});

test("zero credits means empty and any positive balance means ok", () => {
  assert.equal(creditStateFromSnapshot({ balance: 0, status: "ready", hasSnapshot: true }), "empty");
  assert.equal(creditStateFromSnapshot({ balance: -4, status: "ready", hasSnapshot: true }), "empty");
  assert.equal(creditStateFromSnapshot({ balance: 1, status: "ready", hasSnapshot: true }), "ok");
});

test("expired snapshots are discarded instead of becoming a false zero", () => {
  const now = Date.parse("2026-06-01T12:00:00.000Z");
  const expired = normalizeCreditSnapshot(
    {
      balance: 120,
      planCredits: 20,
      purchasedCredits: 100,
      planCreditsTotal: 20,
      purchasedCreditsTotal: 100,
      nearestExpiry: "2026-05-01T00:00:00.000Z",
    },
    now
  );
  assert.equal(expired, null);
});

test("fuel meter never fills at zero and clamps at five bars", () => {
  assert.equal(fuelSegments(0, 100), 0);
  assert.equal(fuelSegments(1, 100), 1);
  assert.equal(fuelSegments(50, 100), 3);
  assert.equal(fuelSegments(100, 100), 5);
  assert.equal(fuelSegments(500, 100), 5);
});

test("expiry days rounds up and clamps past dates to today", () => {
  const now = Date.parse("2026-06-01T00:00:00.000Z");
  assert.equal(creditExpiryDays(null, now), null);
  assert.equal(creditExpiryDays(now - 1, now), 0);
  assert.equal(creditExpiryDays(now + 60 * 60 * 1000, now), 1);
  assert.equal(creditExpiryDays(now + 3 * 86_400_000, now), 3);
});

console.log(`\n${passed} credit-state checks passed.`);
