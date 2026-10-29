// Data access for user-requested Basic trials and the owner review queue.
import type { Pool, PoolClient } from "pg";
import { pool } from "../config/database.ts";

type Db = Pool | PoolClient;

export type TrialRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TrialPlanRow {
  id: number;
  name: string;
  slug: string;
  trial_days: number;
}

export interface TrialSubscriptionRow {
  id: number;
  plan_id: number;
  status: string;
  trial_end: Date | null;
  plan_slug: string;
  plan_name: string;
  is_default_free: boolean;
}

export interface TrialRequestRow {
  id: number;
  userId: number;
  planId: number;
  planName: string;
  planSlug: string;
  status: TrialRequestStatus;
  requestNote: string | null;
  reviewNote: string | null;
  reviewedBy: number | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  creditsGranted: number;
  subscriptionId: number | null;
  orderId: string | null;
}

export interface AdminTrialRequestRow extends TrialRequestRow {
  username: string;
  email: string;
  reviewerEmail: string | null;
}

export interface TrialRequestSummary {
  pending: number;
  approved: number;
  rejected: number;
}

const TRIAL_PLAN_SELECT = `
  SELECT p.id, p.name, p.slug, p.trial_days
  FROM plans p`;

const REQUEST_SELECT = `
  SELECT tr.id, tr.user_id, tr.plan_id, tr.status, tr.request_note,
         tr.review_note, tr.reviewed_by, tr.requested_at, tr.reviewed_at,
         tr.trial_started_at, tr.trial_ends_at, tr.credits_granted,
         tr.subscription_id, tr.order_id,
         p.name AS plan_name, p.slug AS plan_slug
  FROM trial_requests tr
  JOIN plans p ON p.id = tr.plan_id`;

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

function mapRequest(row: Record<string, unknown>): TrialRequestRow {
  return {
    id: toNumber(row.id),
    userId: toNumber(row.user_id),
    planId: toNumber(row.plan_id),
    planName: String(row.plan_name ?? "Basic"),
    planSlug: String(row.plan_slug ?? "basic"),
    status: row.status as TrialRequestStatus,
    requestNote: row.request_note == null ? null : String(row.request_note),
    reviewNote: row.review_note == null ? null : String(row.review_note),
    reviewedBy: row.reviewed_by == null ? null : toNumber(row.reviewed_by),
    requestedAt: toDate(row.requested_at) ?? new Date(0),
    reviewedAt: toDate(row.reviewed_at),
    trialStartedAt: toDate(row.trial_started_at),
    trialEndsAt: toDate(row.trial_ends_at),
    creditsGranted: toNumber(row.credits_granted),
    subscriptionId:
      row.subscription_id == null ? null : toNumber(row.subscription_id),
    orderId: row.order_id == null ? null : String(row.order_id),
  };
}

/** The active Basic plan that can be handed out as a trial, or null. */
export async function getTrialPlan(db: Db = pool): Promise<TrialPlanRow | null> {
  const result = await db.query(
    `${TRIAL_PLAN_SELECT}
     WHERE p.slug = 'basic'
       AND p.status = 'active'
       AND p.trial_days > 0
     LIMIT 1`
  );
  return (result.rows[0] as TrialPlanRow | undefined) ?? null;
}

/** The plan captured by a request, if it is still eligible to be granted. */
export async function getTrialPlanById(
  planId: number,
  db: Db = pool
): Promise<TrialPlanRow | null> {
  const result = await db.query(
    `${TRIAL_PLAN_SELECT}
     WHERE p.id = $1
       AND p.status = 'active'
       AND p.trial_days > 0
     LIMIT 1`,
    [planId]
  );
  return (result.rows[0] as TrialPlanRow | undefined) ?? null;
}

/** The subscription currently granting access. Optionally locks the row. */
export async function getActiveSubscription(
  userId: number,
  db: Db = pool,
  lock = false
): Promise<TrialSubscriptionRow | null> {
  const result = await db.query(
    `SELECT s.id, s.plan_id, s.status, s.trial_end,
            p.slug AS plan_slug, p.name AS plan_name,
            p.is_default_free
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = $1
       AND s.status IN ('trialing', 'active', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
     ORDER BY p.is_default_free ASC, s.started_at DESC, s.id DESC
     LIMIT 1
     ${lock ? "FOR UPDATE OF s" : ""}`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: toNumber(row.id),
    plan_id: toNumber(row.plan_id),
    status: String(row.status),
    trial_end: toDate(row.trial_end),
    plan_slug: String(row.plan_slug),
    plan_name: String(row.plan_name),
    is_default_free: row.is_default_free === true,
  };
}

export async function getLatestRequestForUser(
  userId: number,
  db: Db = pool
): Promise<TrialRequestRow | null> {
  const result = await db.query(
    `${REQUEST_SELECT}
     WHERE tr.user_id = $1
     ORDER BY tr.requested_at DESC, tr.id DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

export async function getPendingRequestForUser(
  userId: number,
  db: Db = pool,
  lock = false
): Promise<TrialRequestRow | null> {
  const result = await db.query(
    `${REQUEST_SELECT}
     WHERE tr.user_id = $1
       AND tr.status = 'pending'
     ORDER BY tr.requested_at DESC, tr.id DESC
     LIMIT 1
     ${lock ? "FOR UPDATE OF tr" : ""}`,
    [userId]
  );
  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

/** Whether the user has already consumed a trial, by request or subscription. */
export async function hasTrialHistory(
  userId: number,
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    `SELECT (
       EXISTS (
         SELECT 1 FROM trial_requests
         WHERE user_id = $1 AND status = 'approved'
       )
       OR EXISTS (
         SELECT 1 FROM subscriptions
         WHERE user_id = $1 AND trial_end IS NOT NULL
       )
     ) AS used`,
    [userId]
  );
  return result.rows[0]?.used === true;
}

export async function getRequestById(
  requestId: number,
  db: Db = pool,
  lock = false
): Promise<TrialRequestRow | null> {
  const result = await db.query(
    `${REQUEST_SELECT}
     WHERE tr.id = $1
     LIMIT 1
     ${lock ? "FOR UPDATE OF tr" : ""}`,
    [requestId]
  );
  return result.rows[0] ? mapRequest(result.rows[0]) : null;
}

export async function insertRequest(
  input: { userId: number; planId: number; note: string | null },
  db: Db
): Promise<number> {
  const result = await db.query(
    `INSERT INTO trial_requests (user_id, plan_id, request_note)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.userId, input.planId, input.note]
  );
  return toNumber(result.rows[0]?.id);
}

export async function updateSubscriptionToTrial(
  input: {
    subscriptionId: number;
    planId: number;
    startsAt: Date;
    trialEndsAt: Date;
    notes: string;
    createdBy: number | null;
  },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE subscriptions
     SET plan_id = $2,
         price_id = NULL,
         status = 'trialing',
         started_at = $3,
         current_period_start = $3,
         current_period_end = $4,
         trial_end = $4,
         cancel_at_period_end = FALSE,
         canceled_at = NULL,
         cancel_reason = NULL,
         source = 'admin_assigned',
         notes = $5,
         created_by = COALESCE($6, created_by),
         gateway_subscription_id = NULL
     WHERE id = $1`,
    [
      input.subscriptionId,
      input.planId,
      input.startsAt,
      input.trialEndsAt,
      input.notes,
      input.createdBy,
    ]
  );
}

export async function insertTrialSubscription(
  input: {
    userId: number;
    planId: number;
    startsAt: Date;
    trialEndsAt: Date;
    notes: string;
    createdBy: number | null;
  },
  db: Db
): Promise<number> {
  const result = await db.query(
    `INSERT INTO subscriptions
       (user_id, plan_id, status, started_at, current_period_start,
        current_period_end, trial_end, source, notes, created_by)
     VALUES ($1, $2, 'trialing', $3, $3, $4, $4, 'admin_assigned', $5, $6)
     RETURNING id`,
    [
      input.userId,
      input.planId,
      input.startsAt,
      input.trialEndsAt,
      input.notes,
      input.createdBy,
    ]
  );
  return toNumber(result.rows[0]?.id);
}

export async function insertTrialOrder(
  input: {
    orderNo: string;
    userId: number;
    planId: number;
    subscriptionId: number;
    startsAt: Date;
    expiresAt: Date;
    validityDays: number;
    credits: number;
    notes: string;
  },
  db: Db
): Promise<{ id: string; orderNo: string }> {
  const result = await db.query(
    `INSERT INTO orders
       (order_no, user_id, order_type, plan_id, catalog_plan_id,
        amount_inr, mrp_inr, discount_inr, currency, status, payment_method,
        gateway, paid_at, validity_days, starts_at, expires_at, credits_total,
        is_active, subscription_id, notes)
     VALUES
       ($1, $2, 'plan', NULL, $3, 0, 0, 0, 'INR', 'paid', 'trial',
        'internal', $4, $5, $4, $6, $7, TRUE, $8, $9)
     RETURNING id, order_no`,
    [
      input.orderNo,
      input.userId,
      input.planId,
      input.startsAt,
      input.validityDays,
      input.expiresAt,
      input.credits,
      input.subscriptionId,
      input.notes,
    ]
  );
  return {
    id: String(result.rows[0]?.id),
    orderNo: String(result.rows[0]?.order_no),
  };
}

export async function markRequestApproved(
  input: {
    requestId: number;
    reviewedBy: number | null;
    subscriptionId: number;
    orderId: string;
    trialStartedAt: Date;
    trialEndsAt: Date;
    creditsGranted: number;
    reviewNote: string | null;
  },
  db: Db
): Promise<void> {
  await db.query(
    `UPDATE trial_requests
     SET status = 'approved',
         review_note = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP,
         trial_started_at = $4,
         trial_ends_at = $5,
         credits_granted = $6,
         subscription_id = $7,
         order_id = $8
     WHERE id = $1
       AND status = 'pending'`,
    [
      input.requestId,
      input.reviewNote,
      input.reviewedBy,
      input.trialStartedAt,
      input.trialEndsAt,
      input.creditsGranted,
      input.subscriptionId,
      input.orderId,
    ]
  );
}

export async function markRequestRejected(
  input: {
    requestId: number;
    reviewedBy: number | null;
    reviewNote: string | null;
  },
  db: Db = pool
): Promise<boolean> {
  const result = await db.query(
    `UPDATE trial_requests
     SET status = 'rejected',
         review_note = $2,
         reviewed_by = $3,
         reviewed_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status = 'pending'
     RETURNING id`,
    [input.requestId, input.reviewNote, input.reviewedBy]
  );
  return result.rows.length > 0;
}

export async function listRequests(
  filters: { status?: TrialRequestStatus; search?: string },
  db: Db = pool
): Promise<AdminTrialRequestRow[]> {
  const search = filters.search?.trim() || null;
  const result = await db.query(
    `SELECT tr.id, tr.user_id, tr.plan_id, tr.status, tr.request_note,
            tr.review_note, tr.reviewed_by, tr.requested_at, tr.reviewed_at,
            tr.trial_started_at, tr.trial_ends_at, tr.credits_granted,
            tr.subscription_id, tr.order_id,
            p.name AS plan_name, p.slug AS plan_slug,
            u.username, u.email, reviewer.email AS reviewer_email
     FROM trial_requests tr
     JOIN plans p ON p.id = tr.plan_id
     JOIN users u ON u.id = tr.user_id
     LEFT JOIN users reviewer ON reviewer.id = tr.reviewed_by
     WHERE ($1::text IS NULL OR tr.status = $1)
       AND (
         $2::text IS NULL
         OR u.username ILIKE '%' || $2 || '%'
         OR u.email ILIKE '%' || $2 || '%'
       )
     ORDER BY CASE WHEN tr.status = 'pending' THEN 0 ELSE 1 END,
              tr.requested_at DESC, tr.id DESC
     LIMIT 200`,
    [filters.status ?? null, search]
  );
  return result.rows.map((row) => ({
    ...mapRequest(row),
    username: String(row.username),
    email: String(row.email),
    reviewerEmail: row.reviewer_email == null ? null : String(row.reviewer_email),
  }));
}

export async function getRequestSummary(db: Db = pool): Promise<TrialRequestSummary> {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
     FROM trial_requests`
  );
  const row = result.rows[0] ?? {};
  return {
    pending: toNumber(row.pending),
    approved: toNumber(row.approved),
    rejected: toNumber(row.rejected),
  };
}
