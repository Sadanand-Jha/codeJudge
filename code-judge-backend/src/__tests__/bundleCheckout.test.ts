import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../config/database.ts";
import {
  findPurchasableCreditPack,
  findPurchasablePlan,
  findLegacyMonthlyPlanId,
  insertBundleGrantOrder,
  insertOrder,
  listBundleGrantOrders,
  refundBundleGrantOrders,
} from "../repositories/billing.repository.ts";

// Runs against a real database inside a transaction that is rolled back, so it
// verifies the parent/child constraints and idempotency without leaving data.
const client = await pool.connect();
try {
  await client.query("BEGIN");

  const user = await client.query("SELECT id FROM users ORDER BY id LIMIT 1");
  assert.ok(user.rows[0], "bundle test needs at least one user");
  const userId = String(user.rows[0].id);

  const plan = await findPurchasablePlan({ planSlug: "pro" }, client);
  assert.ok(plan, "bundle test needs the pro plan");
  const pack = await findPurchasableCreditPack("teacher", client);
  assert.ok(pack, "bundle test needs the teacher pack");
  const legacyPlanId = await findLegacyMonthlyPlanId(plan.slug, client);
  assert.ok(legacyPlanId);
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  const parent = await insertOrder(
    {
      orderNo: `TEST-${suffix}`,
      userId,
      orderType: "bundle",
      planId: legacyPlanId,
      catalogPlanId: plan.planId,
      catalogPriceId: plan.priceId,
      packId: pack.id,
      amountPaise: plan.amountPaise + pack.priceInr * 100 - 1_980,
      mrpPaise: plan.amountPaise + pack.priceInr * 100,
      discountPaise: 1_980,
      currency: "INR",
      validityDays: 30,
      creditsTotal: 0,
      couponId: null,
      couponCode: null,
      notes: "bundle grant test",
      bundlePlanCredits: plan.credits,
      bundlePackCredits: pack.credits,
      bundlePackValidityDays: pack.validityDays,
    },
    client
  );

  const planGrant = await insertBundleGrantOrder(
    {
      orderNo: `TEST-P-${suffix}`,
      userId,
      parentOrderId: parent.id,
      orderType: "plan",
      planId: legacyPlanId,
      catalogPlanId: plan.planId,
      catalogPriceId: plan.priceId,
      packId: null,
      validityDays: 30,
      creditsTotal: plan.credits,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      subscriptionId: null,
    },
    client
  );
  assert.equal(planGrant.parentOrderId, parent.id);
  assert.equal(planGrant.creditsTotal, plan.credits);

  await insertBundleGrantOrder(
    {
      orderNo: `TEST-C-${suffix}`,
      userId,
      parentOrderId: parent.id,
      orderType: "credit_pack",
      planId: null,
      catalogPlanId: null,
      catalogPriceId: null,
      packId: pack.id,
      validityDays: pack.validityDays,
      creditsTotal: pack.credits,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + pack.validityDays * 86_400_000),
      subscriptionId: null,
    },
    client
  );

  const grants = await listBundleGrantOrders(parent.id, client);
  assert.equal(grants.length, 2);

  await client.query("SAVEPOINT duplicate_grant");
  await assert.rejects(
    insertBundleGrantOrder(
      {
        orderNo: `TEST-D-${suffix}`,
        userId,
        parentOrderId: parent.id,
        orderType: "plan",
        planId: legacyPlanId,
        catalogPlanId: plan.planId,
        catalogPriceId: plan.priceId,
        packId: null,
        validityDays: 30,
        creditsTotal: 0,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        subscriptionId: null,
      },
      client
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
  );
  await client.query("ROLLBACK TO SAVEPOINT duplicate_grant");

  const refunded = await refundBundleGrantOrders(parent.id, "test refund", client);
  assert.equal(refunded.length, 2);
  assert.ok(refunded.every((grant) => grant.status === "refunded"));
  assert.ok(refunded.every((grant) => grant.isActive === false));

  await client.query("ROLLBACK");
  console.log("bundleCheckout.test.ts: all assertions passed");
} finally {
  client.release();
  await pool.end();
}
