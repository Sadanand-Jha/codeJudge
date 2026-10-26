// Subscription data access layer. Phase 1 covers entitlement resolution and
// free-plan assignment; plan/admin billing methods are added in later phases.
import { pool } from "../config/database.ts";

export interface PlanSummaryRow {
  id: number;
  name: string;
  slug: string;
  is_default_free: boolean;
  trial_days: number;
}

export interface EntitlementRow {
  key: string;
  value: unknown;
}

export interface ActiveSubscriptionRow {
  id: number;
  plan_id: number;
  status: "trialing" | "active" | "past_due";
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_end: Date | null;
  cancel_at_period_end: boolean;
  started_at: Date;
  plan_slug: string;
  plan_name: string;
  plan_is_default_free: boolean;
}

export interface CreateSubscriptionInput {
  userId: number;
  planId: number;
  priceId?: number | null;
  status?: "trialing" | "active" | "past_due" | "paused";
  startedAt?: Date;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  trialEnd?: Date | null;
  source?: "self_serve" | "admin_assigned" | "coupon" | "migration";
  gatewaySubscriptionId?: string | null;
  notes?: string | null;
  createdBy?: number | null;
}

export class SubscriptionRepository {
  /** The single plan flagged as the default free plan, if configured. */
  async getDefaultFreePlan(): Promise<PlanSummaryRow | null> {
    const result = await pool.query(
      `SELECT id, name, slug, is_default_free, trial_days
       FROM plans
       WHERE is_default_free = true
       LIMIT 1`
    );
    return (result.rows[0] as PlanSummaryRow | undefined) ?? null;
  }

  /** An active plan that can be handed out as a free trial. */
  async getTrialPlan(): Promise<PlanSummaryRow | null> {
    const result = await pool.query(
      `SELECT id, name, slug, is_default_free, trial_days
       FROM plans
       WHERE slug = 'basic'
         AND status = 'active'
         AND trial_days > 0
       LIMIT 1`
    );
    return (result.rows[0] as PlanSummaryRow | undefined) ?? null;
  }

  /**
   * The moment the user's trial starts. It is the registration timestamp:
   * trial_started_at is stamped when the account is created, with created_at /
   * createdat as fallbacks for older rows.
   */
  async getUserTrialStartedAt(userId: number): Promise<Date | null> {
    const result = await pool.query(
      `SELECT COALESCE(trial_started_at, created_at, createdat) AS trial_started_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    const value = result.rows[0]?.trial_started_at as Date | string | null | undefined;
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * The subscription that currently grants access, if any. Past-due
   * subscriptions keep access during the grace period; period-limited
   * subscriptions stop counting once their period has ended (a later cron run
   * flips them to expired).
   */
  async getActiveSubscriptionWithPlan(userId: number): Promise<ActiveSubscriptionRow | null> {
    const result = await pool.query(
      `SELECT s.id, s.plan_id, s.status,
              s.current_period_start, s.current_period_end, s.trial_end,
              s.cancel_at_period_end, s.started_at,
              p.slug AS plan_slug, p.name AS plan_name,
              p.is_default_free AS plan_is_default_free
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1
         AND s.status IN ('trialing', 'active', 'past_due')
         AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
       ORDER BY p.is_default_free ASC, s.started_at DESC
       LIMIT 1`,
      [userId]
    );
    return (result.rows[0] as ActiveSubscriptionRow | undefined) ?? null;
  }

  async getPlanEntitlementRows(planId: number): Promise<EntitlementRow[]> {
    const result = await pool.query(
      `SELECT key, value
       FROM plan_entitlements
       WHERE plan_id = $1`,
      [planId]
    );
    return result.rows as EntitlementRow[];
  }

  /** Non-expired overrides for a subscription (override beats the plan). */
  async getActiveOverrideRows(subscriptionId: number): Promise<EntitlementRow[]> {
    const result = await pool.query(
      `SELECT key, value
       FROM subscription_overrides
       WHERE subscription_id = $1
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [subscriptionId]
    );
    return result.rows as EntitlementRow[];
  }

  /**
   * Atomically assign the free plan when the user has no subscription yet.
   * Returns the subscription id when one was created, otherwise null.
   */
  async insertFreeSubscriptionIfMissing(userId: number, planId: number, source = "migration"): Promise<number | null> {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, started_at, current_period_start, source)
       SELECT $1, $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3
       WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = $1)
       RETURNING id`,
      [userId, planId, source]
    );
    return result.rows[0]?.id ?? null;
  }

  /**
   * Start the new user's trial on the given plan. The window always begins at
   * the registration timestamp so a delayed first login does not extend it.
   * Idempotent and race-safe: no row is created when one already exists.
   */
  async insertTrialSubscriptionIfMissing(
    userId: number,
    planId: number,
    trialDays: number,
    source = "self_serve"
  ): Promise<number | null> {
    const result = await pool.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, started_at,
          current_period_start, current_period_end, trial_end, source)
       SELECT u.id, $2, 'trialing', trial_start,
              trial_start,
              trial_start + ($3::int * INTERVAL '1 day'),
              trial_start + ($3::int * INTERVAL '1 day'),
              $4
       FROM (
         SELECT COALESCE(trial_started_at, created_at, createdat, CURRENT_TIMESTAMP) AS trial_start
         FROM users
         WHERE id = $1
       ) u
       WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = $1)
       RETURNING id`,
      [userId, planId, trialDays, source]
    );
    return (result.rows[0]?.id as number | undefined) ?? null;
  }

  /** The most recent trial window for a user, even after it has ended. */
  async getLatestTrialEnd(userId: number): Promise<Date | null> {
    const result = await pool.query(
      `SELECT trial_end
       FROM subscriptions
       WHERE user_id = $1
         AND trial_end IS NOT NULL
       ORDER BY started_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );
    const value = result.rows[0]?.trial_end as Date | string | null | undefined;
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<{ id: number }> {
    const result = await pool.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, price_id, status, started_at,
          current_period_start, current_period_end, trial_end,
          source, gateway_subscription_id, notes, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP),
               $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        input.userId,
        input.planId,
        input.priceId ?? null,
        input.status ?? "active",
        input.startedAt ?? null,
        input.currentPeriodStart ?? null,
        input.currentPeriodEnd ?? null,
        input.trialEnd ?? null,
        input.source ?? "admin_assigned",
        input.gatewaySubscriptionId ?? null,
        input.notes ?? null,
        input.createdBy ?? null,
      ]
    );
    return { id: result.rows[0].id as number };
  }

  async getSubscriptionById(id: number): Promise<Record<string, unknown> | null> {
    const result = await pool.query(
      `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.id = $1
       LIMIT 1`,
      [id]
    );
    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
