import { pool } from "../config/database.js";

const MAX_PAPER_BYTES = 5 * 1024 * 1024;
const MAX_META_BYTES = 100 * 1024;
const MAX_PREVIEW_DATA_URL_LENGTH = 1024 * 1024;

export interface SavedTestPaperInput {
  draftId: string;
  title: string;
  creationType?: string;
  durationMinutes?: number;
  subjects?: unknown;
  sectionsCount?: number;
  totalQuestions?: number;
  totalMarks?: number;
  meta?: unknown;
  paper: unknown;
  previewDataUrl?: unknown;
}

const asObject = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
};

const toBoundedInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const jsonBytes = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), "utf8");

const normalizeSubjects = (value: unknown): string[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error("Subjects must be an array of strings.");
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 20);
};

const normalizePreviewDataUrl = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > MAX_PREVIEW_DATA_URL_LENGTH ||
    !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new Error("Paper preview image is invalid or too large.");
  }
  return value;
};

const validateInput = (input: SavedTestPaperInput) => {
  const draftId = String(input.draftId ?? "").trim();
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(draftId)) throw new Error("A valid draft id is required.");

  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) throw new Error("Test title is required.");

  const creationType = String(input.creationType ?? "test").trim().slice(0, 40) || "test";
  const subjects = normalizeSubjects(input.subjects);
  const meta = input.meta == null ? {} : asObject(input.meta, "Paper header details are invalid.");
  if (jsonBytes(meta) > MAX_META_BYTES) throw new Error("Paper header details are too large.");
  const previewDataUrl = normalizePreviewDataUrl(input.previewDataUrl);

  const paper = asObject(input.paper, "A generated question paper is required.");
  if (!Array.isArray(paper.sections) || paper.sections.length === 0) {
    throw new Error("A generated question paper with at least one section is required.");
  }
  if (jsonBytes(paper) > MAX_PAPER_BYTES) throw new Error("The generated paper is too large to save.");

  const durationMinutes = toBoundedInt(
    paper.durationMinutes ?? input.durationMinutes,
    0,
    1_440,
    0
  );
  const sectionsCount = toBoundedInt(input.sectionsCount, 0, 100, paper.sections.length);
  const totalQuestions = toBoundedInt(input.totalQuestions ?? paper.totalQuestions, 0, 10_000, 0);
  const totalMarks = toBoundedInt(input.totalMarks ?? paper.totalMarks, 0, 100_000, 0);

  return {
    draftId,
    title,
    creationType,
    durationMinutes,
    subjects,
    sectionsCount,
    totalQuestions,
    totalMarks,
    meta,
    paper,
    previewDataUrl,
  };
};

const toSummary = (row: Record<string, unknown>) => ({
  id: Number(row.id),
  draftId: String(row.draft_id),
  title: String(row.title),
  creationType: String(row.creation_type),
  duration: Number(row.duration_minutes),
  subjects: Array.isArray(row.subjects) ? row.subjects : [],
  sectionsCount: Number(row.sections_count),
  totalQuestions: Number(row.total_questions),
  totalMarks: Number(row.total_marks),
  meta: row.meta_json ?? {},
  previewDataUrl: typeof row.preview_data_url === "string" ? row.preview_data_url : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSavedPaper = (row: Record<string, unknown>) => ({
  ...toSummary(row),
  paper: row.paper_json,
});

const SUMMARY_COLUMNS = `id, draft_id, title, creation_type, duration_minutes, subjects,
  sections_count, total_questions, total_marks, meta_json, preview_data_url, created_at, updated_at`;

export async function listSavedTestPapers(userId: number) {
  const { rows } = await pool.query(
    `SELECT ${SUMMARY_COLUMNS}
       FROM saved_test_papers
      WHERE user_id = $1
      ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows.map(toSummary);
}

export async function getSavedTestPaper(userId: number, paperId: number) {
  const { rows } = await pool.query(
    `SELECT ${SUMMARY_COLUMNS}, paper_json
       FROM saved_test_papers
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
    [paperId, userId]
  );
  if (!rows[0]) throw new Error("Saved test was not found.");
  return toSavedPaper(rows[0]);
}

export async function saveTestPaper(userId: number, input: SavedTestPaperInput) {
  const value = validateInput(input);
  const { rows } = await pool.query(
    `INSERT INTO saved_test_papers (
       user_id, draft_id, title, creation_type, duration_minutes, subjects,
       sections_count, total_questions, total_marks, meta_json, paper_json, preview_data_url
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11::jsonb,$12)
     ON CONFLICT (user_id, draft_id) DO UPDATE SET
       title = EXCLUDED.title,
       creation_type = EXCLUDED.creation_type,
       duration_minutes = EXCLUDED.duration_minutes,
       subjects = EXCLUDED.subjects,
       sections_count = EXCLUDED.sections_count,
       total_questions = EXCLUDED.total_questions,
       total_marks = EXCLUDED.total_marks,
       meta_json = EXCLUDED.meta_json,
       paper_json = EXCLUDED.paper_json,
       preview_data_url = EXCLUDED.preview_data_url,
       updated_at = NOW()
     RETURNING ${SUMMARY_COLUMNS}, paper_json`,
    [
      userId,
      value.draftId,
      value.title,
      value.creationType,
      value.durationMinutes,
      JSON.stringify(value.subjects),
      value.sectionsCount,
      value.totalQuestions,
      value.totalMarks,
      JSON.stringify(value.meta),
      JSON.stringify(value.paper),
      value.previewDataUrl,
    ]
  );
  return toSavedPaper(rows[0]);
}

export async function updateSavedTestPaper(
  userId: number,
  paperId: number,
  input: { title?: unknown; meta?: unknown }
) {
  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) throw new Error("Test title is required.");

  const meta = input.meta == null ? null : asObject(input.meta, "Paper header details are invalid.");
  if (meta && jsonBytes(meta) > MAX_META_BYTES) throw new Error("Paper header details are too large.");

  const { rows } = await pool.query(
    `UPDATE saved_test_papers
        SET title = $3,
            meta_json = COALESCE($4::jsonb, meta_json),
            preview_data_url = NULL,
            updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING ${SUMMARY_COLUMNS}`,
    [paperId, userId, title, meta ? JSON.stringify(meta) : null]
  );
  if (!rows[0]) throw new Error("Saved test was not found.");
  return toSummary(rows[0]);
}

export async function saveSavedTestPaperPreview(
  userId: number,
  paperId: number,
  previewDataUrl: unknown
) {
  const preview = normalizePreviewDataUrl(previewDataUrl);
  if (!preview) throw new Error("A paper preview image is required.");
  const { rows } = await pool.query(
    `UPDATE saved_test_papers
        SET preview_data_url = $3,
            updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING ${SUMMARY_COLUMNS}`,
    [paperId, userId, preview]
  );
  if (!rows[0]) throw new Error("Saved test was not found.");
  return toSummary(rows[0]);
}

export async function deleteSavedTestPaper(userId: number, paperId: number) {
  const result = await pool.query(
    `DELETE FROM saved_test_papers WHERE id = $1 AND user_id = $2`,
    [paperId, userId]
  );
  if (!result.rowCount) throw new Error("Saved test was not found.");
}
