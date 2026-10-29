import assert from "node:assert/strict";
import { waitForCreditRefuel } from "../creditRefuel";

let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`✓ ${name}`);
};

const main = async () => {
  await test("waits until the purchased target balance lands", async () => {
  let balance = 10;
  let refreshes = 0;
  const result = await waitForCreditRefuel({
    refresh: async () => {
      refreshes += 1;
      if (refreshes >= 3) balance = 60;
    },
    readBalance: () => balance,
    targetBalance: 60,
    intervalMs: 1,
  });
  assert.equal(result.status, "refuelled");
  assert.equal(result.balance, 60);
    assert.equal(refreshes, 3);
  });

  await test("does not treat an existing small balance as the new pack", async () => {
  let balance = 12;
  let now = 0;
  const result = await waitForCreditRefuel({
    refresh: async () => {},
    readBalance: () => balance,
    targetBalance: 112,
    timeoutMs: 100,
    intervalMs: 30,
    now: () => now,
    sleep: async (ms) => {
      now += ms;
      balance = 12;
    },
  });
    assert.equal(result.status, "timeout");
    assert.equal(result.balance, 12);
  });

  await test("times out without blocking forever", async () => {
  let now = 0;
  let refreshes = 0;
  const result = await waitForCreditRefuel({
    refresh: async () => {
      refreshes += 1;
    },
    readBalance: () => 0,
    timeoutMs: 100,
    intervalMs: 30,
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
  });
  assert.equal(result.status, "timeout");
  assert.equal(result.balance, 0);
    assert.ok(refreshes > 1, "keeps polling before the deadline");
  });

  console.log(`\n${passed} credit-refuel checks passed.`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
