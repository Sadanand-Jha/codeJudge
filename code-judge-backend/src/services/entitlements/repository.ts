import { pool } from "../../config/database.ts";
import { addDays, isOrderActive } from "./plans.ts";
import { resolveEntitlements } from "./resolver.ts";
import type {
  CreditOrder,
  CreditSummary,
  Entitlements,
  EntitlementSnapshot,
  MonthlyPlan,
  PlanOrder,
  Queryable,
} from "./types.ts";

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function mapPlan(row: Record<string, unknown>): MonthlyPlan {
  return {
    id: toNumber(row.id),
    code: String(row.code ?? "free"),
    name: String(row.name ?? "Free"),
    priceInr: toNumber(row.price_inr),
    mrpInr: toNumber(row.mrp_inr),
    trialDays: toNumber(row.trial_days),
    quizzesPerMonth: toNumber(row.quizzes_per_month),
    roomsLimit: toNumber(row.rooms_limit),
    membersPerRoom: toNumber(row.members_per_room),
    aiCreditsPerMonth: toNumber(row.ai_credits_per_month),
    emailsPerDay: toNumber(row.emails_per_day),
    analyticsLevel: String(row.analytics_level ?? "basic_score"),
    customBranding: toBoolean(row.custom_branding),
    removeWatermark: toBoolean(row.remove_watermark),
    tierRank: toNumber(row.tier_rank),
    validityDays: toNumber(row.validity_days, 30),
    isActive: toBoolean(row.is_active),
  };
}

function mapOrder(
  row: Record<string, unknown>,
  plan: MonthlyPlan
): PlanOrder {
  const startsAt = toDate(row.starts_at);
  const expiresAt = toDate(row.expires_at);
  if (!startsAt || !expiresAt) {
    throw new Error("Order is missing its entitlement window");
  }
  return {
    id: toNumber(row.id),
    userId: toNumber(row.user_id),
    planId: toNumber(row.plan_id),
    startsAt,
    expiresAt,
    validityDays: toNumber(row.validity_days, 30),
    creditsTotal: toNumber(row.credits_total),
    creditsUsed: toNumber(row.credits_used),
    creditsRemaining: toNumber(row.credits_remaining),
    isActive: toBoolean(row.is_active),
    status: String(row.status ?? "pending"),
    createdAt: toDate(row.created_at) ?? startsAt,
    plan,
  };
}

const PLAN_COLUMNS = `
  id, code, name, price_inr, mrp_inr, trial_days, quizzes_per_month,
  rooms_limit, members_per_room, ai_credits_per_month, emails_per_day,
  analytics_level, custom_branding, remove_watermark, tier_rank,
  validity_days, is_active
`;

export async function getPlanByCode(
  code: string,
  db: Queryable = pool
): Promise<MonthlyPlan | null> {
  const result = await db.query(
    `SELECT ${PLAN_COLUMNS} FROM monthly_plans
     WHERE code = $1 AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const row = result.rows[0];
  return row ? mapPlan(row) : null;
}

export async function getPlanById(
  planId: number,
  db: Queryable = pool
): Promise<MonthlyPlan | null> {
  const result = await db.query(
    `SELECT ${PLAN_COLUMNS} FROM monthly_plans WHERE id = $1 LIMIT 1`,
    [planId]
  );
  const row = result.rows[0];
  return row ? mapPlan(row) : null;
}

export async function getActivePlanOrder(
  userId: number,
  now: Date,
  db: Queryable = pool
): Promise<PlanOrder | null> {
  const result = await db.query(
    `SELECT o.id, o.user_id, o.plan_id, o.starts_at, o.expires_at,
            o.validity_days, o.credits_total, o.credits_used,
            o.credits_remaining, o.is_active, o.status, o.created_at
     FROM orders o
     JOIN monthly_plans p ON p.id = o.plan_id
     WHERE o.user_id = $1
       AND o.order_type = 'plan'
       AND o.status = 'paid'
       AND o.is_active = TRUE
       AND p.is_active = TRUE
       AND o.starts_at <= $2
       AND o.expires_at > $2
     ORDER BY p.tier_rank DESC, o.expires_at DESC, o.id DESC
     LIMIT 1`,
    [userId, now]
  );

  const row = result.rows[0];
  if (!row) return null;

  const plan = await getPlanById(toNumber(row.plan_id), db);
  if (!plan) return null;
  return mapOrder(row, plan);
}

export async function getCreditOrders(
  userId: number,
  now: Date,
  db: Queryable = pool
): Promise<CreditOrder[]> {
  const result = await db.query(
    `SELECT id, expires_at, credits_remaining
     FROM orders
     WHERE user_id = $1
       AND status = 'paid'
       AND is_active = TRUE
       AND credits_total > 0
       AND credits_remaining > 0
       AND starts_at <= $2
       AND expires_at > $2
     ORDER BY expires_at ASC, id ASC`,
    [userId, now]
  );

  return result.rows.flatMap((row) => {
    const expiresAt = toDate(row.expires_at);
    const remaining = toNumber(row.credits_remaining);
    if (!expiresAt || remaining <= 0) return [];
    return [{ id: toNumber(row.id), expiresAt, remaining }];
  });
}

function summarizeCredits(orders: CreditOrder[]): CreditSummary {
  const totalRemaining = orders.reduce((sum, order) => sum + order.remaining, 0);
  const first = orders[0];
  return {
    totalRemaining,
    nearestExpiry: first
      ? { amount: first.remaining, at: first.expiresAt }
      : null,
  };
}

async function getUserTrial(
  userId: number,
  db: Queryable
): Promise<{
  trialStartedAt: Date | null;
  createdAt: Date | null;
}> {
  const result = await db.query(
    `SELECT trial_started_at, COALESCE(created_at, createdat) AS created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  return {
    trialStartedAt: toDate(row?.trial_started_at),
    createdAt: toDate(row?.created_at),
  };
}

async function countUsage(
  userId: number,
  eventType: "quiz_created" | "email_sent",
  from: Date,
  to: Date,
  db: Queryable
): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM usage_events
     WHERE user_id = $1
       AND event_type = $2
       AND created_at >= $3
       AND created_at < $4`,
    [userId, eventType, from, to]
  );
  return toNumber(result.rows[0]?.count);
}

async function countEmailsToday(
  userId: number,
  now: Date,
  db: Queryable
): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM usage_events
     WHERE user_id = $1
       AND event_type = 'email_sent'
       AND created_at >= date_trunc('day', $2::timestamptz)
       AND created_at < date_trunc('day', $2::timestamptz) + INTERVAL '1 day'`,
    [userId, now]
  );
  return toNumber(result.rows[0]?.count);
}

export async function loadEntitlementSnapshot(
  userId: number,
  now: Date = new Date(),
  db: Queryable = pool
): Promise<EntitlementSnapshot> {
  const trial = await getUserTrial(userId, db);
  const [freePlan, activePlanOrder, creditOrders, emailsToday] =
    await Promise.all([
      getPlanByCode("free", db),
      getActivePlanOrder(userId, now, db),
      getCreditOrders(userId, now, db),
      countEmailsToday(userId, now, db),
    ]);

  const trialStartedAt = trial.trialStartedAt ?? trial.createdAt ?? now;
  const trialEndsAt = addDays(trialStartedAt, freePlan?.trialDays ?? 0);

  const windowStart =
    activePlanOrder && isOrderActive(activePlanOrder, now)
      ? activePlanOrder.startsAt
      : trialStartedAt;
  const windowEnd =
    activePlanOrder && isOrderActive(activePlanOrder, now)
      ? activePlanOrder.expiresAt
      : trialEndsAt;

  const quizzesUsed = await countUsage(
    userId,
    "quiz_created",
    windowStart,
    windowEnd,
    db
  );

  return {
    userId,
    now,
    trialStartedAt,
    createdAt: trial.createdAt,
    freePlan,
    activePlanOrder,
    credits: summarizeCredits(creditOrders),
    quizzesUsed,
    emailsToday,
  };
}

export async function getEntitlements(
  userId: number | string,
  options: { now?: Date; db?: Queryable } = {}
): Promise<Entitlements> {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }
  const now = options.now ?? new Date();
  const snapshot = await loadEntitlementSnapshot(id, now, options.db ?? pool);
  return resolveEntitlements(snapshot);
}
