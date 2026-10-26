// Credit-pack catalog data access for the /platform pricing console.
import { pool } from "../config/database.ts";

export interface CreditPackRow {
  id: number;
  code: string;
  name: string;
  price_inr: number;
  credits: number;
  validity_days: number;
  description: string | null;
  is_popular: boolean;
  save_percent: number;
  is_active: boolean;
  cta: string | null;
  sort_order: number;
  created_at: Date;
  updated_at?: Date;
  draft_payload: Record<string, unknown> | null;
  draft_updated_at: string | null;
}

export interface CreditPackInput {
  code: string;
  name: string;
  price_inr: number;
  credits: number;
  validity_days: number;
  description?: string | null;
  is_popular?: boolean;
  save_percent?: number;
  is_active?: boolean;
  cta?: string | null;
  sort_order?: number;
}

const PACK_COLUMNS = `
  id, code, name, price_inr, credits, validity_days, description,
  is_popular, save_percent, is_active, cta, sort_order, created_at,
  draft_payload, draft_updated_at
`;

export class CreditPackRepository {
  async listPacks(): Promise<CreditPackRow[]> {
    const result = await pool.query(
      `SELECT ${PACK_COLUMNS}
       FROM ai_credit_packs
       ORDER BY sort_order ASC, id ASC`
    );
    return result.rows as CreditPackRow[];
  }

  async getPackById(id: number): Promise<CreditPackRow | null> {
    const result = await pool.query(
      `SELECT ${PACK_COLUMNS} FROM ai_credit_packs WHERE id = $1 LIMIT 1`,
      [id]
    );
    return (result.rows[0] as CreditPackRow | undefined) ?? null;
  }

  async getPackByCode(code: string): Promise<CreditPackRow | null> {
    const result = await pool.query(
      `SELECT ${PACK_COLUMNS} FROM ai_credit_packs WHERE code = $1 LIMIT 1`,
      [code]
    );
    return (result.rows[0] as CreditPackRow | undefined) ?? null;
  }

  async createPack(input: CreditPackInput): Promise<number> {
    const result = await pool.query(
      `INSERT INTO ai_credit_packs
         (code, name, price_inr, credits, validity_days, description,
          is_popular, save_percent, is_active, cta, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        input.code,
        input.name,
        input.price_inr,
        input.credits,
        input.validity_days,
        input.description ?? null,
        input.is_popular ?? false,
        input.save_percent ?? 0,
        input.is_active ?? true,
        input.cta ?? null,
        input.sort_order ?? 0,
      ]
    );
    return result.rows[0].id as number;
  }

  async updatePack(id: number, input: Partial<CreditPackInput>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    const assign = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (input.code !== undefined) assign("code", input.code);
    if (input.name !== undefined) assign("name", input.name);
    if (input.price_inr !== undefined) assign("price_inr", input.price_inr);
    if (input.credits !== undefined) assign("credits", input.credits);
    if (input.validity_days !== undefined) assign("validity_days", input.validity_days);
    if (input.description !== undefined) assign("description", input.description);
    if (input.is_popular !== undefined) assign("is_popular", input.is_popular);
    if (input.save_percent !== undefined) assign("save_percent", input.save_percent);
    if (input.is_active !== undefined) assign("is_active", input.is_active);
    if (input.cta !== undefined) assign("cta", input.cta);
    if (input.sort_order !== undefined) assign("sort_order", input.sort_order);

    if (sets.length === 0) return;
    params.push(id);
    await pool.query(
      `UPDATE ai_credit_packs SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );
  }

  async getPackByName(name: string): Promise<CreditPackRow | null> {
    const result = await pool.query(
      `SELECT ${PACK_COLUMNS} FROM ai_credit_packs WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name.trim()]
    );
    return (result.rows[0] as CreditPackRow | undefined) ?? null;
  }

  async setActive(id: number, active: boolean): Promise<void> {
    await pool.query(`UPDATE ai_credit_packs SET is_active = $2 WHERE id = $1`, [id, active]);
  }

  async saveDraft(id: number, payload: Record<string, unknown>): Promise<void> {
    await pool.query(
      `UPDATE ai_credit_packs SET draft_payload = $2::jsonb, draft_updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, JSON.stringify(payload)]
    );
  }

  async clearDraft(id: number): Promise<void> {
    await pool.query(
      `UPDATE ai_credit_packs SET draft_payload = NULL, draft_updated_at = NULL WHERE id = $1`,
      [id]
    );
  }

  async reorderPacks(packIds: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let index = 0; index < packIds.length; index++) {
        await client.query(`UPDATE ai_credit_packs SET sort_order = $2 WHERE id = $1`, [packIds[index], index]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deactivatePack(id: number): Promise<void> {
    await pool.query(`UPDATE ai_credit_packs SET is_active = FALSE WHERE id = $1`, [id]);
  }

  async hasOrders(packId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM orders WHERE pack_id = $1 LIMIT 1`,
      [packId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const creditPackRepository = new CreditPackRepository();
