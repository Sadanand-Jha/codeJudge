import assert from "node:assert/strict";
import { pool } from "../../../config/database.ts";
import {
  debitAiCredits,
  getEntitlements,
  refundAiCredits,
} from "../index.ts";
import { EntitlementError } from "../errors.ts";

async function schemaReady(): Promise<boolean> {
  const result = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'monthly_plans' AND column_name = 'rooms_limit') AS plans,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'usage_events') AS usage_events,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'credit_transactions') AS credit_transactions`
  );
  const row = result.rows[0] as Record<string, boolean>;
  return row.plans && row.usage_events && row.credit_transactions;
}

async function main(): Promise<void> {
  if (!(await schemaReady())) {
    console.error(
      "Entitlement tables are missing. Apply migrations 52-55 before running this test."
    );
    process.exitCode = 1;
    return;
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let userId: number | null = null;

  try {
    const user = await pool.query(
      `INSERT INTO users
         (username, email, role_id, avatar_id, country_id, state_id, college_id,
          createdat, created_at, trial_started_at)
       SELECT $1, $2,
              (SELECT id FROM role WHERE LOWER(name) = 'teacher' LIMIT 1),
              (SELECT id FROM avatar LIMIT 1),
              (SELECT id FROM country LIMIT 1),
              (SELECT id FROM state LIMIT 1),
              (SELECT id FROM college LIMIT 1),
              NOW(),
              NOW(),
              NOW() - INTERVAL '30 days'
       RETURNING id`,
      [`entitlement_test_${suffix}`, `entitlement_test_${suffix}@example.com`]
    );
    userId = Number(user.rows[0].id);

    const pack = await pool.query(
      `SELECT id FROM ai_credit_packs WHERE code = 'teacher' LIMIT 1`
    );
    const packId = Number(pack.rows[0]?.id);
    assert.ok(packId, "teacher credit pack is seeded");

    const first = await pool.query(
      `INSERT INTO orders
         (order_no, user_id, order_type, pack_id, amount_inr, mrp_inr,
          validity_days, starts_at, expires_at, credits_total, credits_used,
          status, is_active)
       VALUES ($1, $2, 'credit_pack', $3, 99, 99, 180, NOW(), NOW() + INTERVAL '1 day',
               5, 0, 'paid', TRUE)
       RETURNING id`,
      [`QS-TEST-${suffix}-1`, userId, packId]
    );
    const firstOrderId = Number(first.rows[0].id);

    const second = await pool.query(
      `INSERT INTO orders
         (order_no, user_id, order_type, pack_id, amount_inr, mrp_inr,
          validity_days, starts_at, expires_at, credits_total, credits_used,
          status, is_active)
       VALUES ($1, $2, 'credit_pack', $3, 99, 99, 180, NOW(), NOW() + INTERVAL '2 days',
               3, 0, 'paid', TRUE)
       RETURNING id`,
      [`QS-TEST-${suffix}-2`, userId, packId]
    );
    const secondOrderId = Number(second.rows[0].id);

    const refA = `concurrent-a-${suffix}`;
    const refB = `concurrent-b-${suffix}`;
    const outcomes = await Promise.allSettled([
      debitAiCredits({ userId, amount: 6, refId: refA }),
      debitAiCredits({ userId, amount: 6, refId: refB }),
    ]);

    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<Awaited<ReturnType<typeof debitAiCredits>>> =>
        outcome.status === "fulfilled"
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected"
    );

    assert.equal(fulfilled.length, 1, "exactly one concurrent debit succeeds");
    assert.equal(rejected.length, 1, "exactly one concurrent debit is rejected");
    assert.ok(rejected[0].reason instanceof EntitlementError);
    assert.equal(rejected[0].reason.code, "NO_AI_CREDITS");

    const balances = await pool.query(
      `SELECT id, credits_remaining
       FROM orders
       WHERE id = ANY($1::bigint[])
       ORDER BY id`,
      [[firstOrderId, secondOrderId]]
    );
    const remainingByOrder = new Map(
      balances.rows.map((row) => [Number(row.id), Number(row.credits_remaining)])
    );
    assert.equal(remainingByOrder.get(firstOrderId), 0, "earliest expiry drains first");
    assert.equal(remainingByOrder.get(secondOrderId), 2, "second order keeps the rest");

    const totalRemaining = [...remainingByOrder.values()].reduce((a, b) => a + b, 0);
    assert.equal(totalRemaining, 2);
    assert.ok(totalRemaining >= 0, "credits never go negative");

    const entitlementsBeforeRefund = await getEntitlements(userId);
    assert.equal(entitlementsBeforeRefund.usage.aiCreditsRemaining, 2);

    const successfulRef = outcomes[0].status === "fulfilled" ? refA : refB;
    const refunded = await refundAiCredits({ userId, refId: successfulRef });
    assert.equal(refunded, 6, "the successful debit is refunded");

    const afterRefund = await pool.query(
      `SELECT COALESCE(SUM(credits_remaining), 0)::int AS total
       FROM orders WHERE user_id = $1`,
      [userId]
    );
    assert.equal(Number(afterRefund.rows[0].total), 8);

    const duplicateRefund = await refundAiCredits({ userId, refId: successfulRef });
    assert.equal(duplicateRefund, 0, "refunds are idempotent");

    const entitlementsAfterRefund = await getEntitlements(userId);
    assert.equal(entitlementsAfterRefund.usage.aiCreditsRemaining, 8);

    const ledger = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS net
       FROM credit_transactions WHERE user_id = $1`,
      [userId]
    );
    assert.equal(Number(ledger.rows[0].net), 0, "ledger is balanced after refund");

    console.log("Entitlement concurrency: 13 checks passed.");
  } finally {
    if (userId !== null) {
      await pool.query(`DELETE FROM credit_transactions WHERE user_id = $1`, [userId]);
      await pool.query(`DELETE FROM usage_events WHERE user_id = $1`, [userId]);
      await pool.query(`DELETE FROM nudge_events WHERE user_id = $1`, [userId]);
      await pool.query(`DELETE FROM orders WHERE user_id = $1`, [userId]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
