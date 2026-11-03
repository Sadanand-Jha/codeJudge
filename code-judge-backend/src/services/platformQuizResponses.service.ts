/**
 * Owner-only data access for the platform student-responses console.
 *
 * Lets the owner pick a quiz, inspect every attempt, edit the saved answers of
 * a final attempt, and then re-grade that attempt from the corrected answers.
 * All callers are owner-gated (see routes/v1/platform.routes.ts → requireOwner).
 */
import { pool } from "../config/database.ts";

const FINAL_ATTEMPT_STATUSES = new Set(["completed", "timed_out", "submitted_late"]);

function fail(message: string, statusCode: number): never {
  throw Object.assign(new Error(message), { statusCode });
}

export interface PlatformQuizOptionRow {
  id: number;
  name: string;
  code: string;
  attempts: number;
  lastActivity: string | null;
}

export interface PlatformAttemptRow {
  id: number;
  userId: number;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  score: number | null;
  percentage: number | null;
  rank: number | null;
  correctAnswers: number | null;
  wrongAnswers: number | null;
  skippedQuestions: number | null;
  totalQuestions: number | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attemptNumber: number;
  resultDetailsVisible: boolean;
}

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function listQuizOptions(search?: string | null): Promise<PlatformQuizOptionRow[]> {
  const term = typeof search === "string" ? search.trim().slice(0, 100) : "";
  const pattern = term ? `%${term}%` : null;
  const result = await pool.query(
    `SELECT q.id,
            q.name,
            q.code,
            COUNT(a.id)::int AS attempts,
            MAX(COALESCE(a.completed_at, a.updated_at, a.created_at)) AS "lastActivity"
       FROM quiz q
       LEFT JOIN quiz_attempt a ON a.quiz_id = q.id AND a.deleted_at IS NULL
      WHERE q.deleted_at IS NULL
        AND ($1::text IS NULL OR q.name ILIKE $1 OR q.code ILIKE $1)
      GROUP BY q.id, q.name, q.code
      ORDER BY attempts DESC, "lastActivity" DESC NULLS LAST, q.id DESC
      LIMIT 200`,
    [pattern]
  );
  return result.rows as PlatformQuizOptionRow[];
}

export async function listQuizAttempts(
  quizId: number,
  search?: string | null
): Promise<{ quiz: { id: number; name: string; code: string }; attempts: PlatformAttemptRow[] }> {
  const quiz = await pool.query(
    `SELECT id, name, code FROM quiz WHERE id = $1 AND deleted_at IS NULL`,
    [quizId]
  );
  if (!quiz.rows.length) fail("Quiz not found.", 404);

  const term = typeof search === "string" ? search.trim().slice(0, 100) : "";
  const pattern = term ? `%${term}%` : null;
  const result = await pool.query(
    `SELECT a.id,
            a.user_id AS "userId",
            u.username,
            u.email,
            u.first_name AS "firstName",
            u.last_name AS "lastName",
            a.status,
            a.score,
            a.percentage,
            a.rank,
            a.correct_answers AS "correctAnswers",
            a.wrong_answers AS "wrongAnswers",
            a.skipped_questions AS "skippedQuestions",
            a.total_questions AS "totalQuestions",
            a.completed_at AS "completedAt",
            a.created_at AS "createdAt",
            a.updated_at AS "updatedAt",
            a.result_details_visible AS "resultDetailsVisible",
            ROW_NUMBER() OVER (
              PARTITION BY a.user_id ORDER BY a.created_at ASC, a.id ASC
            )::int AS "attemptNumber"
       FROM quiz_attempt a
       JOIN users u ON u.id = a.user_id
      WHERE a.quiz_id = $1
        AND a.deleted_at IS NULL
        AND (
          $2::text IS NULL
          OR u.username ILIKE $2
          OR u.email ILIKE $2
          OR u.first_name ILIKE $2
          OR u.last_name ILIKE $2
        )
      ORDER BY COALESCE(a.completed_at, a.updated_at, a.created_at) DESC, a.id DESC
      LIMIT 500`,
    [quizId, pattern]
  );

  return { quiz: quiz.rows[0], attempts: result.rows as PlatformAttemptRow[] };
}

export async function setAttemptResultDetailsVisibility(
  quizId: number,
  attemptId: number,
  visible: boolean
): Promise<{ resultDetailsVisible: boolean }> {
  const result = await pool.query(
    `UPDATE quiz_attempt
        SET result_details_visible = $3
      WHERE id = $1 AND quiz_id = $2 AND deleted_at IS NULL
      RETURNING result_details_visible AS "resultDetailsVisible"`,
    [attemptId, quizId, visible]
  );
  if (!result.rows.length) fail("Attempt not found for this quiz.", 404);
  return result.rows[0] as { resultDetailsVisible: boolean };
}

export async function getQuizAttemptDetail(quizId: number, attemptId: number) {
  const attemptResult = await pool.query(
    `SELECT a.id,
            a.user_id AS "userId",
            a.quiz_id AS "quizId",
            a.status,
            a.score,
            a.percentage,
            a.rank,
            a.marks_obtained AS "marksObtained",
            a.total_marks AS "totalMarks",
            a.correct_answers AS "correctAnswers",
            a.wrong_answers AS "wrongAnswers",
            a.skipped_questions AS "skippedQuestions",
            a.total_questions AS "totalQuestions",
            a.started_at AS "startedAt",
            a.completed_at AS "completedAt",
            a.created_at AS "createdAt",
            a.updated_at AS "updatedAt",
            a.result_details_visible AS "resultDetailsVisible",
            q.name AS "quizName",
            q.code AS "quizCode",
            q.passing_marks AS "passingMarks",
            u.username,
            u.email,
            u.first_name AS "firstName",
            u.last_name AS "lastName"
       FROM quiz_attempt a
       JOIN quiz q ON q.id = a.quiz_id AND q.deleted_at IS NULL
       JOIN users u ON u.id = a.user_id
      WHERE a.id = $1 AND a.quiz_id = $2 AND a.deleted_at IS NULL`,
    [attemptId, quizId]
  );
  if (!attemptResult.rows.length) fail("Attempt not found for this quiz.", 404);

  const [questionsResult, optionsResult] = await Promise.all([
    pool.query(
      `SELECT qp.id,
              qp.question_number AS "questionNumber",
              qp.problem_statement AS "statement",
              qp.problem_description AS "description",
              qp.explaination AS "explanation",
              qp.quiz_problem_type AS "type",
              qpt.name AS "typeName",
              qp.marks,
              qp.negative_marks AS "negativeMarks",
              qsr.id AS "responseId",
              qsr.answer,
              qsr.is_attempted AS "isAttempted",
              qsr.time_spent_seconds AS "timeSpentSeconds",
              qsr.updated_at AS "responseUpdatedAt"
         FROM quiz_problems qp
         LEFT JOIN quiz_problem_type qpt ON qpt.id = qp.quiz_problem_type
         LEFT JOIN quiz_student_response qsr
           ON qsr.problem_id = qp.id AND qsr.attempt_id = $1
        WHERE qp.quiz_id = $2 AND qp.deleted_at IS NULL
        ORDER BY qp.question_number ASC, qp.id ASC`,
      [attemptId, quizId]
    ),
    pool.query(
      `SELECT o.id,
              o.problem_id AS "problemId",
              o.option_statement AS "statement",
              o.option_description AS "description",
              o.iscorrect AS "isCorrect",
              o.sort_order AS "sortOrder"
         FROM quiz_problem_options o
         JOIN quiz_problems qp ON qp.id = o.problem_id
        WHERE qp.quiz_id = $1 AND qp.deleted_at IS NULL
        ORDER BY o.problem_id ASC, o.sort_order ASC, o.id ASC`,
      [quizId]
    ),
  ]);

  const optionsByProblem = new Map<number, Array<Record<string, unknown>>>();
  for (const option of optionsResult.rows) {
    const problemId = Number(option.problemId);
    const list = optionsByProblem.get(problemId) ?? [];
    list.push({
      id: Number(option.id),
      statement: option.statement,
      description: option.description,
      isCorrect: option.isCorrect === true,
      sortOrder: option.sortOrder,
    });
    optionsByProblem.set(problemId, list);
  }

  const questions = questionsResult.rows.map((row) => ({
    id: Number(row.id),
    questionNumber: row.questionNumber,
    statement: row.statement,
    description: row.description,
    explanation: row.explanation,
    type: row.type == null ? null : Number(row.type),
    typeName: row.typeName,
    marks: row.marks == null ? null : Number(row.marks),
    negativeMarks: row.negativeMarks == null ? null : Number(row.negativeMarks),
    options: optionsByProblem.get(Number(row.id)) ?? [],
    response: row.responseId == null
      ? null
      : {
          id: Number(row.responseId),
          answer: row.answer,
          isAttempted: row.isAttempted === true,
          timeSpentSeconds: row.timeSpentSeconds == null ? null : Number(row.timeSpentSeconds),
          updatedAt: row.responseUpdatedAt,
        },
  }));

  return { attempt: attemptResult.rows[0], questions };
}

export interface ResponseUpdateInput {
  problemId?: unknown;
  optionId?: unknown;
  optionIds?: unknown;
  textAnswer?: unknown;
}

export async function updateQuizAttemptResponses(
  quizId: number,
  attemptId: number,
  rawResponses: unknown
): Promise<number> {
  const attemptResult = await pool.query(
    `SELECT id, status FROM quiz_attempt
      WHERE id = $1 AND quiz_id = $2 AND deleted_at IS NULL`,
    [attemptId, quizId]
  );
  if (!attemptResult.rows.length) fail("Attempt not found for this quiz.", 404);
  const status = String(attemptResult.rows[0].status ?? "").toLowerCase();
  if (!FINAL_ATTEMPT_STATUSES.has(status)) {
    fail("Only completed attempts can have their responses edited.", 409);
  }

  const problemsResult = await pool.query(
    `SELECT id, quiz_problem_type AS type FROM quiz_problems
      WHERE quiz_id = $1 AND deleted_at IS NULL`,
    [quizId]
  );
  const problems = new Map<number, number | null>();
  for (const row of problemsResult.rows) {
    problems.set(Number(row.id), row.type == null ? null : Number(row.type));
  }

  const optionsResult = await pool.query(
    `SELECT o.id, o.problem_id AS "problemId"
       FROM quiz_problem_options o
       JOIN quiz_problems qp ON qp.id = o.problem_id
      WHERE qp.quiz_id = $1 AND qp.deleted_at IS NULL`,
    [quizId]
  );
  const optionsByProblem = new Map<number, Set<number>>();
  for (const row of optionsResult.rows) {
    const problemId = Number(row.problemId);
    const set = optionsByProblem.get(problemId) ?? new Set<number>();
    set.add(Number(row.id));
    optionsByProblem.set(problemId, set);
  }

  if (!Array.isArray(rawResponses) || rawResponses.length === 0) {
    fail("At least one response is required.", 400);
  }

  const normalized: Array<{ problemId: number; answer: Record<string, unknown> | null }> = [];
  for (const raw of rawResponses as ResponseUpdateInput[]) {
    const problemId = positiveInt(raw?.problemId);
    if (!problemId || !problems.has(problemId)) {
      fail(`Question ${String(raw?.problemId ?? "")} does not belong to this quiz.`, 400);
    }

    const type = problems.get(problemId);
    const allowedOptions = optionsByProblem.get(problemId) ?? new Set<number>();
    let answer: Record<string, unknown> | null = null;

    if (type === 2) {
      const rawIds = Array.isArray(raw.optionIds) ? raw.optionIds : [];
      const optionIds = [...new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
      for (const optionId of optionIds) {
        if (!allowedOptions.has(optionId)) {
          fail(`Option ${optionId} does not belong to question ${problemId}.`, 400);
        }
      }
      if (optionIds.length) answer = { type: "MULTI", selectedOptionIds: optionIds };
    } else if (allowedOptions.size > 0) {
      if (raw.optionId !== undefined && raw.optionId !== null && raw.optionId !== "") {
        const optionId = positiveInt(raw.optionId);
        if (!optionId || !allowedOptions.has(optionId)) {
          fail(`Option ${String(raw.optionId)} does not belong to question ${problemId}.`, 400);
        }
        answer = { type: "MCQ", selectedOptionId: optionId };
      }
    } else {
      const text = typeof raw.textAnswer === "string" ? raw.textAnswer.trim() : "";
      if (text) answer = { type: "TEXT", text };
    }

    normalized.push({ problemId, answer });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const response of normalized) {
      await client.query(
        `INSERT INTO quiz_student_response
           (attempt_id, problem_id, answer, is_attempted, time_spent_seconds, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (attempt_id, problem_id) DO UPDATE
           SET answer = EXCLUDED.answer,
               is_attempted = EXCLUDED.is_attempted,
               updated_at = CURRENT_TIMESTAMP`,
        [
          attemptId,
          response.problemId,
          response.answer ? JSON.stringify(response.answer) : null,
          response.answer !== null,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return normalized.length;
}
