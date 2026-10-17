// Plan catalog data access for the /platform subscriptions console.
// All multi-step writes run in a transaction; price rows are never deleted
// once referenced by a subscription (grandfathering) — they are deactivated
// and replaced so existing subscriptions keep their snapshot.
import { pool } from "../config/database.ts";

export type PlanStatus = "draft" | "active" | "archived";
export type BillingPeriod = "monthly" | "quarterly" | "yearly" | "lifetime" | "custom_days";
export type SubscriptionLifecycleStatus = "trialing" | "active" | "past_due" | "paused" | "canceled" | "expired";

export interface PlanPriceInput {
  billing_period: BillingPeriod;
  custom_days?: number | null;
  amount: number;
  tax_inclusive?: boolean;
  gateway_price_id?: string | null;
  is_active?: boolean;
}

export interface PlanPriceRow extends Required<Omit<PlanPriceInput, "custom_days">> {
  id: number;
  plan_id: number;
  custom_days: number | null;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlanRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: PlanStatus;
  is_public: boolean;
  is_default_free: boolean;
  sort_order: number;
  trial_days: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanListRow extends PlanRow {
  prices: PlanPriceRow[];
  subscriber_count: number;
  active_subscriber_count: number;
}

export interface PlanDetailRow extends PlanListRow {
  entitlements: Record<string, unknown>;
}

export interface CreatePlanData {
  name: string;
  slug: string;
  description?: string | null;
  status?: PlanStatus;
  is_public?: boolean;
  sort_order?: number;
  trial_days?: number;
  prices: PlanPriceInput[];
  entitlements: Record<string, number | boolean>;
}

const LIFECYCLE_STATUSES: SubscriptionLifecycleStatus[] = ["trialing", "active", "past_due", "paused"];

function lifecycleStatusList(): string {
  return LIFECYCLE_STATUSES.map((s) => `'${s}'`).join(", ");
}

const PLAN_WITH_STATS_SELECT = `
  SELECT p.id, p.name, p.slug, p.description, p.status, p.is_public,
         p.is_default_free, p.sort_order, p.trial_days, p.archived_at,
         p.created_at, p.updated_at,
         COALESCE(prices.rows, '[]'::json) AS prices,
         COALESCE(stats.total, 0) AS subscriber_count,
         COALESCE(stats.active, 0) AS active_subscriber_count
  FROM plans p
  LEFT JOIN LATERAL (
    SELECT json_agg(pp ORDER BY pp.billing_period, pp.custom_days) AS rows
    FROM plan_prices pp
    WHERE pp.plan_id = p.id
  ) AS prices ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE s.status IN (${lifecycleStatusList()}))::int AS active
    FROM subscriptions s
    WHERE s.plan_id = p.id
  ) AS stats ON true
`;

export class PlanRepository {
  async listPlans(filters: { search?: string; status?: PlanStatus }): Promise<PlanListRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length})`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `${PLAN_WITH_STATS_SELECT} ${where} ORDER BY p.sort_order ASC, p.id ASC`,
      params
    );
    return result.rows as PlanListRow[];
  }

  async getPlanById(id: number): Promise<PlanDetailRow | null> {
    const result = await pool.query(
      `${PLAN_WITH_STATS_SELECT} WHERE p.id = $1 LIMIT 1`,
      [id]
    );
    const plan = result.rows[0] as PlanDetailRow | undefined;
    if (!plan) return null;

    const entitlements = await pool.query(
      `SELECT key, value FROM plan_entitlements WHERE plan_id = $1`,
      [id]
    );
    plan.entitlements = Object.fromEntries(
      (entitlements.rows as Array<{ key: string; value: unknown }>).map((row) => [row.key, row.value])
    );
    return plan;
  }

  async getPlanBySlug(slug: string): Promise<PlanRow | null> {
    const result = await pool.query(`SELECT * FROM plans WHERE slug = $1 LIMIT 1`, [slug]);
    return (result.rows[0] as PlanRow | undefined) ?? null;
  }

  async countSubscriptionsForPlan(planId: number, onlyLifecycle = false): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS c FROM subscriptions
       WHERE plan_id = $1 ${onlyLifecycle ? `AND status IN (${lifecycleStatusList()})` : ""}`,
      [planId]
    );
    return result.rows[0]?.c ?? 0;
  }

  async createPlan(data: CreatePlanData): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const planResult = await client.query(
        `INSERT INTO plans (name, slug, description, status, is_public, sort_order, trial_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          data.name,
          data.slug,
          data.description ?? null,
          data.status ?? "draft",
          data.is_public ?? false,
          data.sort_order ?? 0,
          data.trial_days ?? 0,
        ]
      );
      const planId = planResult.rows[0].id as number;

      for (const price of data.prices) {
        await client.query(
          `INSERT INTO plan_prices (plan_id, billing_period, custom_days, amount, currency, tax_inclusive, gateway_price_id, is_active)
           VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7)`,
          [
            planId,
            price.billing_period,
            price.custom_days ?? null,
            price.amount,
            price.tax_inclusive ?? true,
            price.gateway_price_id ?? null,
            price.is_active ?? true,
          ]
        );
      }

      for (const [key, value] of Object.entries(data.entitlements)) {
        await client.query(
          `INSERT INTO plan_entitlements (plan_id, key, value) VALUES ($1, $2, $3::jsonb)`,
          [planId, key, JSON.stringify(value)]
        );
      }

      await client.query("COMMIT");
      return planId;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a plan's basics, replace its price set and entitlement set.
   *
   * - Prices that are referenced by subscriptions are never deleted; they are
   *   deactivated and replaced (existing subscribers are grandfathered on the
   *   old price_id). `migrateSubscribers` repoints existing subscriptions to
   *   the replacement prices.
   * - Entitlements passed in replace the full set: omitted keys are removed.
   *
   * Returns the change summary for the audit log.
   */
  async updatePlan(
    planId: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      is_public?: boolean;
      sort_order?: number;
      trial_days?: number;
      prices?: PlanPriceInput[];
      entitlements?: Record<string, number | boolean>;
      migrateSubscribers?: boolean;
      expectedUpdatedAt?: Date;
    }
  ): Promise<
    | { ok: true; changed: boolean; priceMap: Record<number, number>; deactivatedPriceIds: number[]; migratedSubscribers: number }
    | { ok: false; conflict: true }
  > {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Optimistic locking: when the client sends the updated_at it last saw,
      // reject edits based on stale data. Millisecond truncation keeps the
      // round-trip through JSON lossless.
      if (data.expectedUpdatedAt) {
        const guard = await client.query(
          `SELECT 1 FROM plans WHERE id = $1 AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $2::timestamptz) FOR UPDATE`,
          [planId, data.expectedUpdatedAt]
        );
        if (guard.rowCount === 0) {
          await client.query("ROLLBACK");
          return { ok: false, conflict: true };
        }
      } else {
        const lock = await client.query(`SELECT 1 FROM plans WHERE id = $1 FOR UPDATE`, [planId]);
        if (lock.rowCount === 0) {
          await client.query("ROLLBACK");
          throw new Error("PLAN_NOT_FOUND");
        }
      }

      const sets: string[] = [];
      const params: unknown[] = [];
      const assign = (column: string, value: unknown) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      };
      if (data.name !== undefined) assign("name", data.name);
      if (data.slug !== undefined) assign("slug", data.slug);
      if (data.description !== undefined) assign("description", data.description);
      if (data.is_public !== undefined) assign("is_public", data.is_public);
      if (data.sort_order !== undefined) assign("sort_order", data.sort_order);
      if (data.trial_days !== undefined) assign("trial_days", data.trial_days);

      if (sets.length > 0) {
        params.push(planId);
        await client.query(`UPDATE plans SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
      }

      const priceMap: Record<number, number> = {};
      const deactivatedPriceIds: number[] = [];

      if (data.prices) {
        const existingResult = await client.query(
          `SELECT * FROM plan_prices WHERE plan_id = $1 ORDER BY id`,
          [planId]
        );
        const existing = existingResult.rows as PlanPriceRow[];

        const keyOf = (period: string, customDays: number | null) => `${period}|${customDays ?? 0}`;
        const existingByKey = new Map<string, PlanPriceRow>();
        for (const row of existing) existingByKey.set(keyOf(row.billing_period, row.custom_days), row);

        const keepIds = new Set<number>();

        for (const incoming of data.prices) {
          const key = keyOf(incoming.billing_period, incoming.custom_days ?? null);
          const current = existingByKey.get(key);
          const normalized = {
            amount: incoming.amount,
            tax_inclusive: incoming.tax_inclusive ?? true,
            gateway_price_id: incoming.gateway_price_id ?? null,
            is_active: incoming.is_active ?? true,
          };

          if (
            current &&
            current.is_active &&
            current.amount === normalized.amount &&
            current.tax_inclusive === normalized.tax_inclusive &&
            (current.gateway_price_id ?? null) === normalized.gateway_price_id &&
            current.is_active === normalized.is_active
          ) {
            keepIds.add(current.id);
            continue;
          }

          if (current && current.is_active) {
            await client.query(`UPDATE plan_prices SET is_active = false WHERE id = $1`, [current.id]);
            deactivatedPriceIds.push(current.id);
          }

          const inserted = await client.query(
            `INSERT INTO plan_prices (plan_id, billing_period, custom_days, amount, currency, tax_inclusive, gateway_price_id, is_active)
             VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7)
             RETURNING id`,
            [
              planId,
              incoming.billing_period,
              incoming.custom_days ?? null,
              normalized.amount,
              normalized.tax_inclusive,
              normalized.gateway_price_id,
              normalized.is_active,
            ]
          );
          const newId = inserted.rows[0].id as number;
          if (current) priceMap[current.id] = newId;
          keepIds.add(newId);
        }

        // Deactivate active prices whose billing period was removed entirely.
        for (const row of existing) {
          if (row.is_active && !keepIds.has(row.id)) {
            await client.query(`UPDATE plan_prices SET is_active = false WHERE id = $1`, [row.id]);
            deactivatedPriceIds.push(row.id);
          }
        }
      }

      if (data.entitlements) {
        const keys = Object.keys(data.entitlements);
        await client.query(
          `DELETE FROM plan_entitlements WHERE plan_id = $1 AND NOT (key = ANY($2::text[]))`,
          [planId, keys]
        );
        for (const [key, value] of Object.entries(data.entitlements)) {
          await client.query(
            `INSERT INTO plan_entitlements (plan_id, key, value)
             VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (plan_id, key) DO UPDATE SET value = EXCLUDED.value`,
            [planId, key, JSON.stringify(value)]
          );
        }
      }

      let migratedSubscribers = 0;
      if (data.migrateSubscribers && Object.keys(priceMap).length > 0) {
        const oldIds = Object.keys(priceMap).map(Number);
        const newIds = oldIds.map((oldId) => priceMap[oldId]);
        const migration = await client.query(
          `UPDATE subscriptions
           SET price_id = new_price_map.new_price_id
           FROM unnest($1::int[], $2::int[]) AS new_price_map(old_price_id, new_price_id)
           WHERE subscriptions.plan_id = $3
             AND subscriptions.price_id = new_price_map.old_price_id`,
          [oldIds, newIds, planId]
        );
        migratedSubscribers = migration.rowCount ?? 0;
      }

      await client.query("COMMIT");
      return {
        ok: true,
        changed: sets.length > 0 || (data.prices?.length ?? 0) > 0 || !!data.entitlements,
        priceMap,
        deactivatedPriceIds,
        migratedSubscribers,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setPlanStatus(planId: number, status: PlanStatus): Promise<void> {
    await pool.query(
      `UPDATE plans SET status = $2, archived_at = CASE WHEN $2 = 'archived' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = $1`,
      [planId, status]
    );
  }

  /**
   * Move every lifecycle subscription from one plan to another (archive with
   * migration target). price_id is cleared because the target plan may not
   * have the same price points.
   */
  async migrateSubscribers(fromPlanId: number, toPlanId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE subscriptions
       SET plan_id = $2, price_id = NULL
       WHERE plan_id = $1 AND status IN (${lifecycleStatusList()})`,
      [fromPlanId, toPlanId]
    );
    return result.rowCount ?? 0;
  }

  async deletePlan(planId: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM plans p
       WHERE p.id = $1
         AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.plan_id = p.id)`,
      [planId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * True when the plan ever had subscribers moved off it. Subscription rows
   * are repointed during archive-migration, so the audit trail is the durable
   * "has had subscriptions" signal used by the delete rule.
   */
  async hasPlanMigrationHistory(planId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM subscription_audit_log
       WHERE entity_type = 'plan' AND entity_id = $1 AND action = 'plan.migrate_subscribers'
       LIMIT 1`,
      [String(planId)]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async reorderPlans(planIds: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let index = 0; index < planIds.length; index++) {
        await client.query(`UPDATE plans SET sort_order = $2 WHERE id = $1`, [planIds[index], index]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /** Per-price subscriber counts used by the impact preview. */
  async getPriceSubscriberCounts(planId: number): Promise<Record<number, number>> {
    const result = await pool.query(
      `SELECT price_id, COUNT(*)::int AS c
       FROM subscriptions
       WHERE plan_id = $1 AND price_id IS NOT NULL AND status IN (${lifecycleStatusList()})
       GROUP BY price_id`,
      [planId]
    );
    const counts: Record<number, number> = {};
    for (const row of result.rows as Array<{ price_id: number; c: number }>) counts[row.price_id] = row.c;
    return counts;
  }
}

export const planRepository = new PlanRepository();
