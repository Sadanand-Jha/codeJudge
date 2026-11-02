// Referral data access: shareable codes, signup attribution, qualification and
// the zero-price credit grant orders used to make bonus credits spendable.
import type { Pool, PoolClient } from "pg";
import { pool } from "../config/database.ts";

type Db = Pool | PoolClient;

export type ReferralStatus = "pending" | "qualified" | "rejected";

export interface ReferralOwnerRow {
  id: number;
  username: string;
}

export interface ReferralStatsRow {
  friendsSignedUp: number;
  firstPlansBought: number;
  creditsEarned: number;
}

export interface RecentReferralRow {
  id: number;
  status: ReferralStatus;
  rewardCredits: number;
  signupAt: Date;
  qualifiedAt: Date | null;
  username: string;
  displayName: string | null;
  planName: string | null;
}

export interface PendingReferralRow {
  id: number;
  referrerUserId: number;
  referredUserId: number;
  rewardCredits: number;
}

export interface ReferralBonusPackRow {
  id: number;
  validityDays: number;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function findUserByReferralCode(
  code: string,
  db: Db = pool
): Promise<ReferralOwnerRow | null> {
  const result = await db.query(
    `SELECT id, username
       FROM users
      WHERE UPPER(referral_code) = UPPER($1)
      LIMIT 1`,
    [code]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: toNumber(row.id), username: String(row.username ?? "") };
}

export async function referralCodeExists(
  code: string,
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM users WHERE UPPER(referral_code) = UPPER($1) LIMIT 1`,
    [code]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getUsernameById(
  userId: number,
  db: Db = pool
): Promise<string | null> {
  const result = await db.query(`SELECT username FROM users WHERE id = $1`, [
    userId,
  ]);
  const row = result.rows[0];
  return row ? String(row.username ?? "") : null;
}

export async function getUserReferralCode(
  userId: number,
  db: Db = pool
): Promise<string | null> {
  const result = await db.query(`SELECT referral_code FROM users WHERE id = $1`, [
    userId,
  ]);
  const value = result.rows[0]?.referral_code;
  return value == null ? null : String(value);
}

export async function setUserReferralCode(
  userId: number,
  code: string,
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    `UPDATE users
        SET referral_code = $2
      WHERE id = $1
        AND referral_code IS NULL`,
    [userId, code]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertReferral(
  input: {
    referrerUserId: number;
    referredUserId: number;
    code: string;
  },
  db: Db = pool
): Promise<void> {
  await db.query(
    `INSERT INTO referrals (referrer_user_id, referred_user_id, code)
     VALUES ($1, $2, $3)
     ON CONFLICT (referred_user_id) DO NOTHING`,
    [input.referrerUserId, input.referredUserId, input.code]
  );
}

export async function getReferralStats(
  userId: number,
  db: Db = pool
): Promise<ReferralStatsRow> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS friends_signed_up,
            COUNT(*) FILTER (WHERE status = 'qualified')::int AS first_plans_bought,
            COALESCE(SUM(reward_credits) FILTER (WHERE status = 'qualified'), 0)::int AS credits_earned
       FROM referrals
      WHERE referrer_user_id = $1`,
    [userId]
  );
  const row = result.rows[0] ?? {};
  return {
    friendsSignedUp: toNumber(row.friends_signed_up),
    firstPlansBought: toNumber(row.first_plans_bought),
    creditsEarned: toNumber(row.credits_earned),
  };
}

export async function getRecentReferrals(
  userId: number,
  limit = 10,
  db: Db = pool
): Promise<RecentReferralRow[]> {
  const result = await db.query(
    `SELECT r.id, r.status, r.reward_credits, r.signup_at, r.qualified_at,
            u.username, u.display_name,
            p.name AS plan_name
       FROM referrals r
       JOIN users u ON u.id = r.referred_user_id
       LEFT JOIN orders o ON o.id = r.order_id
       LEFT JOIN plans p ON p.id = o.catalog_plan_id
      WHERE r.referrer_user_id = $1
      ORDER BY r.signup_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map((row) => ({
    id: toNumber(row.id),
    status: row.status as ReferralStatus,
    rewardCredits: toNumber(row.reward_credits),
    signupAt: toDate(row.signup_at) ?? new Date(0),
    qualifiedAt: toDate(row.qualified_at),
    username: String(row.username ?? ""),
    displayName: row.display_name == null ? null : String(row.display_name),
    planName: row.plan_name == null ? null : String(row.plan_name),
  }));
}

export async function getReferralBonusPack(
  db: Db = pool
): Promise<ReferralBonusPackRow | null> {
  const result = await db.query(
    `SELECT id, validity_days
       FROM ai_credit_packs
      WHERE code = 'referral_bonus'
      LIMIT 1`
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: toNumber(row.id),
    validityDays: Math.max(1, toNumber(row.validity_days, 180)),
  };
}

export async function lockPendingReferralForUser(
  referredUserId: number,
  db: Db
): Promise<PendingReferralRow | null> {
  const result = await db.query(
    `SELECT id, referrer_user_id, referred_user_id, reward_credits
       FROM referrals
      WHERE referred_user_id = $1
        AND status = 'pending'
      FOR UPDATE`,
    [referredUserId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: toNumber(row.id),
    referrerUserId: toNumber(row.referrer_user_id),
    referredUserId: toNumber(row.referred_user_id),
    rewardCredits: toNumber(row.reward_credits),
  };
}

export async function hasPriorPaidPlanOrder(
  input: { userId: number; excludeOrderId: string },
  db: Db
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
       FROM orders
      WHERE user_id = $1
        AND id <> $2
        AND status = 'paid'
        AND order_type IN ('plan', 'bundle')
        AND parent_order_id IS NULL
        AND COALESCE(payment_method, '') <> 'trial'
      LIMIT 1`,
    [input.userId, input.excludeOrderId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markReferralQualified(
  input: { id: number; orderId: string },
  db: Db
): Promise<boolean> {
  const result = await db.query(
    `UPDATE referrals
        SET status = 'qualified',
            qualified_at = CURRENT_TIMESTAMP,
            order_id = $2,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND status = 'pending'`,
    [input.id, input.orderId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertReferralBonusOrder(
  input: {
    orderNo: string;
    userId: number;
    packId: number;
    credits: number;
    validityDays: number;
    startsAt: Date;
    expiresAt: Date;
    notes: string;
  },
  db: Db
): Promise<{ id: string; orderNo: string }> {
  const result = await db.query(
    `INSERT INTO orders
       (order_no, user_id, order_type, pack_id, amount_inr, mrp_inr,
        discount_inr, currency, status, payment_method, gateway, paid_at,
        validity_days, starts_at, expires_at, credits_total, is_active, notes)
     VALUES
       ($1, $2, 'credit_pack', $3, 0, 0, 0, 'INR', 'paid', 'referral',
        'internal', $4, $5, $4, $6, $7, TRUE, $8)
     RETURNING id, order_no`,
    [
      input.orderNo,
      input.userId,
      input.packId,
      input.startsAt,
      input.validityDays,
      input.expiresAt,
      input.credits,
      input.notes.slice(0, 255),
    ]
  );
  const row = result.rows[0];
  return { id: String(row.id), orderNo: String(row.order_no) };
}

export async function markReferrerRewarded(
  input: { id: number; orderId: string },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE referrals
        SET referrer_reward_order_id = $2,
            referrer_rewarded_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND referrer_rewarded_at IS NULL`,
    [input.id, input.orderId]
  );
}

export async function markReferredRewarded(
  input: { id: number; orderId: string },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE referrals
        SET referred_reward_order_id = $2,
            referred_rewarded_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND referred_rewarded_at IS NULL`,
    [input.id, input.orderId]
  );
}
