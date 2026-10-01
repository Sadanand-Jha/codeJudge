import { pool } from "../config/database.js";

const validateSections = (sections: unknown): unknown[] => {
  if (!Array.isArray(sections) || sections.length === 0 || sections.length > 30) {
    throw new Error("A blueprint must contain between 1 and 30 sections.");
  }
  const bytes = Buffer.byteLength(JSON.stringify(sections), "utf8");
  if (bytes > 500_000) throw new Error("Blueprint JSON is too large.");
  for (const section of sections) {
    if (!section || typeof section !== "object" || !Array.isArray((section as { questionGroups?: unknown }).questionGroups)) {
      throw new Error("Blueprint contains an invalid section structure.");
    }
  }
  return sections;
};

const toBlueprint = (row: Record<string, unknown>) => ({
  id: Number(row.id),
  name: String(row.name),
  description: String(row.description ?? ""),
  sections: row.sections_json,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastUsedAt: row.last_used_at,
});

export async function listSectionBlueprints(userId: number) {
  const { rows } = await pool.query(
    `SELECT id, name, description, sections_json, created_at, updated_at, last_used_at
     FROM test_section_blueprints WHERE user_id = $1
     ORDER BY COALESCE(last_used_at, updated_at) DESC, id DESC`,
    [userId]
  );
  return rows.map(toBlueprint);
}

export async function createSectionBlueprint(input: { userId: number; name: string; description?: string; sections: unknown }) {
  const name = input.name.trim().slice(0, 120);
  const description = (input.description ?? "").trim().slice(0, 500);
  if (!name) throw new Error("Blueprint name is required.");
  const sections = validateSections(input.sections);
  const { rows } = await pool.query(
    `INSERT INTO test_section_blueprints (user_id, name, description, sections_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, name, description, sections_json, created_at, updated_at, last_used_at`,
    [input.userId, name, description, JSON.stringify(sections)]
  );
  return toBlueprint(rows[0]);
}

export async function markSectionBlueprintUsed(userId: number, blueprintId: number) {
  const { rows } = await pool.query(
    `UPDATE test_section_blueprints SET last_used_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, description, sections_json, created_at, updated_at, last_used_at`,
    [blueprintId, userId]
  );
  if (!rows[0]) throw new Error("Blueprint was not found.");
  return toBlueprint(rows[0]);
}

export async function deleteSectionBlueprint(userId: number, blueprintId: number) {
  const result = await pool.query(`DELETE FROM test_section_blueprints WHERE id = $1 AND user_id = $2`, [blueprintId, userId]);
  if (!result.rowCount) throw new Error("Blueprint was not found.");
}
