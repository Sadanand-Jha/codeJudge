import type { PoolClient } from "pg";
import {
  decryptOptionRows,
  encryptText,
} from "../services/quizContentCrypto.service.ts";

export interface QuizProblemOptionInput {
  id?: number;
  optionStatement: string;
  optionDescription?: string | null;
  matchingTarget?: string | null;
  matching_target?: string | null;
  isCorrect: boolean;
}

export interface SavedQuizProblemOption {
  id: number;
  problem_id: number;
  option_statement: string;
  option_description: string | null;
  matching_target: string | null;
  iscorrect: boolean;
  sort_order: number;
}

export interface QuizProblemOptionSyncResult {
  options: SavedQuizProblemOption[];
  gradingChanged: boolean;
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value);
  return normalized.length > 0 ? normalized : null;
}

function targetOf(option: QuizProblemOptionInput): string | null {
  return nullableText(option.matchingTarget ?? option.matching_target);
}

/**
 * Upsert a problem's options while keeping existing option ids and their
 * student-answer references intact. Options removed by the teacher are deleted;
 * their responses are treated as skipped by the grader.
 */
export async function syncQuizProblemOptions(
  client: PoolClient,
  problemId: number,
  incoming: QuizProblemOptionInput[]
): Promise<QuizProblemOptionSyncResult> {
  const existingResult = await client.query<SavedQuizProblemOption>(
    `SELECT id, problem_id, option_statement, option_description,
            matching_target, iscorrect, sort_order
     FROM quiz_problem_options
     WHERE problem_id = $1
     ORDER BY sort_order ASC, id ASC
     FOR UPDATE`,
    [problemId]
  );
  const existing = decryptOptionRows(existingResult.rows);
  const existingById = new Map(existing.map((option) => [Number(option.id), option]));
  const incomingIds = new Set<number>();
  let gradingChanged = false;

  for (const option of incoming) {
    const optionId = Number(option.id);
    if (!Number.isInteger(optionId) || optionId <= 0 || !existingById.has(optionId)) {
      gradingChanged = true;
      continue;
    }
    incomingIds.add(optionId);
    const current = existingById.get(optionId)!;
    if (
      text(current.option_statement) !== text(option.optionStatement)
      || nullableText(current.option_description) !== nullableText(option.optionDescription)
      || nullableText(current.matching_target) !== targetOf(option)
      || Boolean(current.iscorrect) !== Boolean(option.isCorrect)
    ) {
      gradingChanged = true;
    }
  }

  for (const current of existing) {
    if (!incomingIds.has(Number(current.id))) {
      gradingChanged = true;
      break;
    }
  }

  const usedIds: number[] = [];
  for (let index = 0; index < incoming.length; index += 1) {
    const option = incoming[index];
    const matchingTarget = targetOf(option);
    const optionDescription = nullableText(option.optionDescription);
    const optionId = Number(option.id);
    const canUpdate = Number.isInteger(optionId) && optionId > 0 && existingById.has(optionId);

    if (canUpdate) {
      await client.query(
        `UPDATE quiz_problem_options
         SET option_statement = $1,
             option_description = $2,
             matching_target = $3,
             iscorrect = $4,
             sort_order = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND problem_id = $7`,
        [
          encryptText(option.optionStatement),
          encryptText(optionDescription),
          encryptText(matchingTarget),
          Boolean(option.isCorrect),
          index,
          optionId,
          problemId,
        ]
      );
      usedIds.push(optionId);
    } else {
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO quiz_problem_options (
           problem_id, option_statement, option_description, matching_target,
           iscorrect, sort_order, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          problemId,
          encryptText(option.optionStatement),
          encryptText(optionDescription),
          encryptText(matchingTarget),
          Boolean(option.isCorrect),
          index,
        ]
      );
      usedIds.push(Number(inserted.rows[0].id));
    }
  }

  if (usedIds.length > 0) {
    await client.query(
      `DELETE FROM quiz_problem_options
       WHERE problem_id = $1 AND NOT (id = ANY($2::int[]))`,
      [problemId, usedIds]
    );
  } else {
    await client.query("DELETE FROM quiz_problem_options WHERE problem_id = $1", [problemId]);
  }

  const savedResult = await client.query<SavedQuizProblemOption>(
    `SELECT id, problem_id, option_statement, option_description,
            matching_target, iscorrect, sort_order
     FROM quiz_problem_options
     WHERE problem_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [problemId]
  );

  return { options: decryptOptionRows(savedResult.rows), gradingChanged };
}
