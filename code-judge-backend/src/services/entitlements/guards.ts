import type { PoolClient } from "pg";
import { pool } from "../../config/database.ts";
import { EntitlementError } from "./errors.ts";
import { allocateCredits } from "./plans.ts";
import type {
  CreditAllocation,
  CreditOrder,
  Entitlements,
  PlanFeature,
} from "./types.ts";

const LOCK_NAMESPACE = 72_831;

interface GuardOptions {
  requiredPlan?: string | null;
  upgradeUrl?: string | null;
}

export async function withEntitlementLock<T>(
  userId: number | string,
  action: (client: PoolClient) => Promise<T>
): Promise<T> {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
      LOCK_NAMESPACE,
      id,
    ]);
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original error is more useful than a rollback failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

export function assertPlanActive(
  entitlements: Entitlements,
  options: GuardOptions = {}
): void {
  if (entitlements.plan.status !== "expired") return;
  throw new EntitlementError(
    "PLAN_EXPIRED",
    "Your plan has expired. Existing content stays available, but new items are locked until you renew.",
    {
      limit: entitlements.limits.quizzes,
      used: entitlements.usage.quizzesUsed,
      remaining: 0,
      requiredPlan: options.requiredPlan ?? null,
      upgradeUrl: options.upgradeUrl,
    }
  );
}

export function assertQuizQuota(
  entitlements: Entitlements,
  options: GuardOptions = {}
): void {
  assertPlanActive(entitlements, options);
  const limit = entitlements.limits.quizzes;
  if (limit < 0) return;
  if (entitlements.usage.quizzesUsed < limit) return;
  throw new EntitlementError(
    "QUIZ_LIMIT_REACHED",
    `You have used all ${limit} quiz creations in this plan window.`,
    {
      limit,
      used: entitlements.usage.quizzesUsed,
      remaining: 0,
      requiredPlan: options.requiredPlan ?? null,
      upgradeUrl: options.upgradeUrl,
    }
  );
}

export function assertRoomQuota(
  entitlements: Entitlements,
  roomsUsed: number,
  options: GuardOptions = {}
): void {
  assertPlanActive(entitlements, options);
  const limit = entitlements.limits.rooms;
  if (limit < 0 || roomsUsed < limit) return;
  throw new EntitlementError(
    "ROOM_LIMIT_REACHED",
    `You have reached the ${limit}-room limit for your plan.`,
    {
      limit,
      used: roomsUsed,
      remaining: 0,
      requiredPlan: options.requiredPlan ?? null,
      upgradeUrl: options.upgradeUrl,
    }
  );
}

export function assertMemberQuota(
  entitlements: Entitlements,
  membersUsed: number
): void {
  const limit = entitlements.limits.membersPerRoom;
  if (limit < 0 || membersUsed < limit) return;
  throw new EntitlementError(
    "ROOM_MEMBER_LIMIT",
    "This room is full, please ask your teacher.",
    {
      limit,
      used: membersUsed,
      remaining: 0,
      requiredPlan: null,
      upgradeUrl: null,
    }
  );
}

export function assertEmailQuota(
  entitlements: Entitlements,
  options: GuardOptions = {}
): void {
  assertPlanActive(entitlements, options);
  const limit = entitlements.limits.emailsPerDay;
  if (limit < 0) return;
  if (entitlements.usage.emailsToday < limit) return;
  throw new EntitlementError(
    "EMAIL_DAILY_LIMIT",
    limit === 0
      ? "Emailing results is not included in your current plan."
      : `You have used all ${limit} result emails for today.`,
    {
      limit,
      used: entitlements.usage.emailsToday,
      remaining: 0,
      requiredPlan: options.requiredPlan ?? null,
      upgradeUrl: options.upgradeUrl,
    }
  );
}

export function assertFeature(
  entitlements: Entitlements,
  feature: PlanFeature,
  options: GuardOptions = {}
): void {
  assertPlanActive(entitlements, options);
  if (entitlements.features[feature]) return;
  throw new EntitlementError(
    "FEATURE_LOCKED",
    "This feature is not included in your current plan.",
    {
      requiredPlan: options.requiredPlan ?? null,
      upgradeUrl: options.upgradeUrl,
    }
  );
}

export async function recordUsage(
  client: PoolClient,
  input: {
    userId: number;
    eventType: "quiz_created" | "email_sent";
    refId?: string | null;
    orderId?: number | null;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO usage_events (user_id, event_type, ref_id, order_id)
     VALUES ($1, $2, $3, $4)`,
    [
      input.userId,
      input.eventType,
      input.refId ?? null,
      input.orderId ?? null,
    ]
  );
}

export async function debitAiCredits(input: {
  userId: number;
  amount: number;
  reason?: string;
  refId?: string | null;
  now?: Date;
}): Promise<{ allocations: CreditAllocation[]; available: number }> {
  const amount = Math.trunc(input.amount);
  if (amount <= 0) {
    throw new Error("AI credit cost must be a positive integer");
  }

  return withEntitlementLock(input.userId, async (client) => {
    const now = input.now ?? new Date();
    const result = await client.query(
      `SELECT id, expires_at, credits_remaining
       FROM orders
       WHERE user_id = $1
         AND status = 'paid'
         AND is_active = TRUE
         AND credits_total > 0
         AND credits_remaining > 0
         AND starts_at <= $2
         AND expires_at > $2
       ORDER BY expires_at ASC, id ASC
       FOR UPDATE`,
      [input.userId, now]
    );

    const orders: CreditOrder[] = result.rows.flatMap((row) => {
      const expiresAt = row.expires_at instanceof Date
        ? row.expires_at
        : new Date(String(row.expires_at));
      const remaining = Number(row.credits_remaining);
      if (Number.isNaN(expiresAt.getTime()) || remaining <= 0) return [];
      return [{ id: Number(row.id), expiresAt, remaining }];
    });

    const allocation = allocateCredits(orders, amount);
    if (allocation.remaining > 0) {
      throw new EntitlementError(
        "NO_AI_CREDITS",
        "You do not have enough AI credits for this action.",
        {
          limit: amount,
          used: allocation.available,
          remaining: 0,
          requiredPlan: null,
          upgradeUrl: "/pricing/credits",
        }
      );
    }

    for (const entry of allocation.allocations) {
      const updated = await client.query(
        `UPDATE orders
         SET credits_used = credits_used + $1
         WHERE id = $2 AND credits_remaining >= $1
         RETURNING credits_remaining`,
        [entry.amount, entry.orderId]
      );
      const balanceAfter = updated.rows[0]?.credits_remaining;
      if (balanceAfter === undefined) {
        throw new Error("AI credit debit conflicted with another request");
      }
      await client.query(
        `INSERT INTO credit_transactions
           (user_id, order_id, amount, reason, ref_id, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId,
          entry.orderId,
          -entry.amount,
          input.reason ?? "ai_generation",
          input.refId ?? null,
          Number(balanceAfter),
        ]
      );
    }

    return { allocations: allocation.allocations, available: allocation.available };
  });
}

export async function refundAiCredits(input: {
  userId: number;
  refId: string;
}): Promise<number> {
  return withEntitlementLock(input.userId, async (client) => {
    const alreadyRefunded = await client.query(
      `SELECT 1 FROM credit_transactions
       WHERE user_id = $1 AND ref_id = $2 AND amount > 0
       LIMIT 1`,
      [input.userId, input.refId]
    );
    if (alreadyRefunded.rows.length > 0) return 0;

    const debits = await client.query(
      `SELECT id, order_id, amount
       FROM credit_transactions
       WHERE user_id = $1 AND ref_id = $2 AND amount < 0
        AND reason LIKE 'ai_%'
       ORDER BY id ASC`,
      [input.userId, input.refId]
    );

    let refunded = 0;
    for (const row of debits.rows) {
      if (row.order_id === null) continue;
      const amount = Math.abs(Number(row.amount));
      if (amount <= 0) continue;
      const updated = await client.query(
        `UPDATE orders
         SET credits_used = GREATEST(0, credits_used - $1)
         WHERE id = $2
         RETURNING credits_remaining`,
        [amount, row.order_id]
      );
      if (updated.rows.length === 0) continue;
      await client.query(
        `INSERT INTO credit_transactions
           (user_id, order_id, amount, reason, ref_id, balance_after)
         VALUES ($1, $2, $3, 'ai_refund', $4, $5)`,
        [
          input.userId,
          row.order_id,
          amount,
          input.refId,
          Number(updated.rows[0].credits_remaining),
        ]
      );
      refunded += amount;
    }

    return refunded;
  });
}
