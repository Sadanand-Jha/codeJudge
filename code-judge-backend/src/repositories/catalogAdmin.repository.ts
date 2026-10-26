// Catalog authoring data access for /platform: coupons, editable page content
// and version history for draft/publish workflows.
import { pool } from "../config/database.ts";

export type CouponType = "percent" | "flat" | "free_days";
export type CouponStatus = "active" | "disabled";

export interface CouponRow {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  applies_to_plan_ids: number[] | null;
  max_redemptions: number | null;
  per_user_limit: number;
  valid_from: string | null;
  valid_until: string | null;
  status: CouponStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  draft_payload: Record<string, unknown> | null;
  draft_updated_at: string | null;
  redemption_count: number;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  applies_to_plan_ids?: number[] | null;
  max_redemptions?: number | null;
  per_user_limit?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  status?: CouponStatus;
}

export interface PageContentRow {
  key: string;
  value: string;
  draft_value: string | null;
  updated_by: number | null;
  updated_at: string;
}

export interface VersionRow {
  id: number;
  action: string;
  actor_id: number | null;
  actor_role: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  created_at: string;
}

const COUPON_SELECT = `
  SELECT c.id, c.code, c.type, c.value, c.applies_to_plan_ids,
         c.max_redemptions, c.per_user_limit, c.valid_from, c.valid_until,
         c.status, c.created_by, c.created_at, c.updated_at,
         c.draft_payload, c.draft_updated_at,
         COALESCE(r.redemptions, 0)::int AS redemption_count
  FROM coupons c
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS redemptions
    FROM coupon_redemptions cr
    WHERE cr.coupon_id = c.id
  ) r ON TRUE
`;

export class CatalogAdminRepository {
  async listVersions(
    entityType: string,
    entityId: string | number,
    limit = 25
  ): Promise<VersionRow[]> {
    const result = await pool.query(
      `SELECT id, action, actor_id, actor_role, before, after, reason, created_at
       FROM subscription_audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY id DESC
       LIMIT $3`,
      [entityType, String(entityId), limit]
    );
    return result.rows as VersionRow[];
  }

  async listCoupons(): Promise<CouponRow[]> {
    const result = await pool.query(`${COUPON_SELECT} ORDER BY c.created_at DESC, c.id DESC`);
    return result.rows as CouponRow[];
  }

  async getCouponById(id: number): Promise<CouponRow | null> {
    const result = await pool.query(`${COUPON_SELECT} WHERE c.id = $1 LIMIT 1`, [id]);
    return (result.rows[0] as CouponRow | undefined) ?? null;
  }

  async getCouponByCode(code: string): Promise<CouponRow | null> {
    const result = await pool.query(`${COUPON_SELECT} WHERE LOWER(c.code) = LOWER($1) LIMIT 1`, [code.trim()]);
    return (result.rows[0] as CouponRow | undefined) ?? null;
  }

  async createCoupon(input: CouponInput & { created_by?: number | null }): Promise<number> {
    const result = await pool.query(
      `INSERT INTO coupons
         (code, type, value, applies_to_plan_ids, max_redemptions,
          per_user_limit, valid_from, valid_until, status, created_by)
       VALUES ($1, $2, $3, $4::int[], $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.code,
        input.type,
        input.value,
        input.applies_to_plan_ids ?? null,
        input.max_redemptions ?? null,
        input.per_user_limit ?? 1,
        input.valid_from ?? null,
        input.valid_until ?? null,
        input.status ?? "active",
        input.created_by ?? null,
      ]
    );
    return result.rows[0].id as number;
  }

  async updateCoupon(id: number, input: Partial<CouponInput>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    const assign = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if (input.code !== undefined) assign("code", input.code);
    if (input.type !== undefined) assign("type", input.type);
    if (input.value !== undefined) assign("value", input.value);
    if (input.applies_to_plan_ids !== undefined) assign("applies_to_plan_ids", input.applies_to_plan_ids);
    if (input.max_redemptions !== undefined) assign("max_redemptions", input.max_redemptions);
    if (input.per_user_limit !== undefined) assign("per_user_limit", input.per_user_limit);
    if (input.valid_from !== undefined) assign("valid_from", input.valid_from);
    if (input.valid_until !== undefined) assign("valid_until", input.valid_until);
    if (input.status !== undefined) assign("status", input.status);
    if (sets.length === 0) return;
    params.push(id);
    await pool.query(`UPDATE coupons SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
  }

  async setCouponStatus(id: number, status: CouponStatus): Promise<void> {
    await pool.query(`UPDATE coupons SET status = $2 WHERE id = $1`, [id, status]);
  }

  async saveCouponDraft(id: number, payload: Record<string, unknown>): Promise<void> {
    await pool.query(
      `UPDATE coupons SET draft_payload = $2::jsonb, draft_updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, JSON.stringify(payload)]
    );
  }

  async clearCouponDraft(id: number): Promise<void> {
    await pool.query(
      `UPDATE coupons SET draft_payload = NULL, draft_updated_at = NULL WHERE id = $1`,
      [id]
    );
  }

  async listPageContent(): Promise<PageContentRow[]> {
    const result = await pool.query(
      `SELECT key, value, draft_value, updated_by, updated_at
       FROM pricing_page_content
       ORDER BY key ASC`
    );
    return result.rows as PageContentRow[];
  }

  async saveContentDrafts(entries: Record<string, string>, actorId?: number | null): Promise<void> {
    const keys = Object.keys(entries);
    if (keys.length === 0) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const key of keys) {
        await client.query(
          `UPDATE pricing_page_content
           SET draft_value = $2, updated_by = $3
           WHERE key = $1`,
          [key, entries[key], actorId ?? null]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async publishContent(keys: string[], actorId?: number | null): Promise<Array<{ key: string; before: string; after: string }>> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT key, value, draft_value
         FROM pricing_page_content
         WHERE key = ANY($1::text[]) AND draft_value IS NOT NULL
         FOR UPDATE`,
        [keys]
      );
      const changed: Array<{ key: string; before: string; after: string }> = [];
      for (const row of result.rows as PageContentRow[]) {
        const after = row.draft_value;
        if (after === null) continue;
        changed.push({ key: row.key, before: row.value, after });
        await client.query(
          `UPDATE pricing_page_content
           SET value = draft_value, draft_value = NULL, updated_by = $2
           WHERE key = $1`,
          [row.key, actorId ?? null]
        );
      }
      await client.query("COMMIT");
      return changed;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getLiveContent(): Promise<Record<string, string>> {
    const result = await pool.query(`SELECT key, value FROM pricing_page_content`);
    return Object.fromEntries(
      (result.rows as Array<{ key: string; value: string }>).map((row) => [row.key, row.value])
    );
  }
}

export const catalogAdminRepository = new CatalogAdminRepository();
