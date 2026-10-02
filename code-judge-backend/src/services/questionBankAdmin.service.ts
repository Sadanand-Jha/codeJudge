/**
 * Owner-facing reads/deletes for the curated subjective question bank.
 *
 * The bank stores relational scope IDs (subject/chapter/topic/difficulty/
 * category) plus the render-ready text + HTML of every question. This service
 * joins those lookups so the private platform console can present questions
 * subject-wise, chapter-wise and topic-wise, and delete a single question.
 *
 * All callers are owner-gated (see routes/v1/platform.routes.ts → requireOwner).
 */
import { pool } from "../config/database.ts";

export interface ListQuestionFilters {
  subjectId?: number | null;
  chapterId?: number | null;
  topicId?: number | null;
  difficultyId?: number | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export interface BankQuestionRow {
  id: number;
  subjectId: number;
  subjectName: string;
  chapterId: number | null;
  chapterName: string | null;
  topicId: number | null;
  topicName: string | null;
  difficultyId: number;
  difficulty: string;
  categoryId: number;
  category: string;
  questionText: string;
  questionHtml: string;
  createdAt: string;
}

const MAX_LIMIT = 100;

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function listBankQuestions(filters: ListQuestionFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (filters.subjectId) add("qb.subject_id = ?", filters.subjectId);
  if (filters.chapterId) add("qb.chapter_id = ?", filters.chapterId);
  if (filters.topicId) add("qb.topic_id = ?", filters.topicId);
  if (filters.difficultyId) add("qb.difficulty_id = ?", filters.difficultyId);
  if (filters.search) add("qb.question_text ILIKE ?", `%${filters.search}%`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = clampInt(filters.page, 1, 1, 100000);
  const limit = clampInt(filters.limit, 50, 1, MAX_LIMIT);
  const offset = (page - 1) * limit;

  const base = `
    FROM subjective_question_bank qb
    JOIN subjects s ON s.id = qb.subject_id
    JOIN question_difficulty qd ON qd.id = qb.difficulty_id
    JOIN question_category qc ON qc.id = qb.category_id
    LEFT JOIN subject_chapters sc ON sc.id = qb.chapter_id
    LEFT JOIN chapter_topics ct ON ct.id = qb.topic_id
    ${whereSql}`;

  const [rowsResult, countResult, subjectsResult, chaptersResult, topicsResult, difficultiesResult] = await Promise.all([
    pool.query(
      `SELECT qb.id,
              qb.subject_id AS "subjectId", s.subject_name AS "subjectName",
              qb.chapter_id AS "chapterId", sc.chapter_name AS "chapterName",
              qb.topic_id AS "topicId", ct.topic_name AS "topicName",
              qb.difficulty_id AS "difficultyId", qd.name AS "difficulty",
              qb.category_id AS "categoryId", qc.name AS "category",
              qb.question_text AS "questionText", qb.question_html AS "questionHtml",
              qb.created_at AS "createdAt"
       ${base}
       ORDER BY s.subject_name, sc.chapter_name NULLS FIRST, ct.topic_name NULLS FIRST, qb.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset] as never[]
    ),
    pool.query(`SELECT count(*)::int AS total ${base}`, params as never[]),
    pool.query(
      `SELECT s.id, s.subject_name AS name, count(qb.id)::int AS count
       FROM subjects s
       LEFT JOIN subjective_question_bank qb ON qb.subject_id = s.id
       GROUP BY s.id, s.subject_name
       HAVING count(qb.id) > 0
       ORDER BY s.subject_name`
    ),
    pool.query(
      `SELECT sc.id, sc.subject_id AS "subjectId", sc.chapter_name AS name, count(qb.id)::int AS count
       FROM subject_chapters sc
       LEFT JOIN subjective_question_bank qb ON qb.chapter_id = sc.id
       GROUP BY sc.id, sc.subject_id, sc.chapter_name
       HAVING count(qb.id) > 0
       ORDER BY sc.chapter_name`
    ),
    pool.query(
      `SELECT ct.id, ct.chapter_id AS "chapterId", ct.topic_name AS name, count(qb.id)::int AS count
       FROM chapter_topics ct
       LEFT JOIN subjective_question_bank qb ON qb.topic_id = ct.id
       GROUP BY ct.id, ct.chapter_id, ct.topic_name
       HAVING count(qb.id) > 0
       ORDER BY ct.topic_name`
    ),
    pool.query(`SELECT id, name FROM question_difficulty ORDER BY id`),
  ]);

  const total = Number(countResult.rows[0]?.total ?? 0);

  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    questions: rowsResult.rows as BankQuestionRow[],
    facets: {
      subjects: subjectsResult.rows as { id: number; name: string; count: number }[],
      chapters: chaptersResult.rows as { id: number; subjectId: number; name: string; count: number }[],
      topics: topicsResult.rows as { id: number; chapterId: number; name: string; count: number }[],
      difficulties: difficultiesResult.rows as { id: number; name: string }[],
    },
  };
}

export async function deleteBankQuestion(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM subjective_question_bank WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}