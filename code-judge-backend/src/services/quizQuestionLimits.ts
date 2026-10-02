// Per-quiz question cap — shared business logic for every question creation
// path (single add, bulk save, duplicate) across the user and admin stacks.
// Limits are enforced here so no client can bypass them; the frontend only
// surfaces the error when the cap is hit.
import { pool } from "../config/database.ts";

/** Maximum questions a single quiz may contain. */
export const MAX_QUESTIONS_PER_QUIZ = 30;

export type QuizQuestionLimitCode = "MAX_QUESTIONS_PER_QUIZ";

/**
 * Thrown when adding question(s) would exceed the per-quiz cap.
 * Controllers map this to HTTP 429 with the message shown to the user.
 */
export class QuizQuestionLimitError extends Error {
  code: QuizQuestionLimitCode;

  constructor(message?: string) {
    super(message ?? `A quiz can have at most ${MAX_QUESTIONS_PER_QUIZ} questions.`);
    this.name = "QuizQuestionLimitError";
    this.code = "MAX_QUESTIONS_PER_QUIZ";
  }
}

/** Live (non-deleted) question count for a quiz. */
export async function getLiveQuestionCount(quizId: number | string): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM quiz_problems WHERE quiz_id = $1 AND deleted_at IS NULL",
    [quizId]
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * Enforce the per-quiz question cap. Resolves silently when `newQuestions`
 * more questions fit, otherwise throws QuizQuestionLimitError.
 */
export async function assertQuestionsCanBeAdded(
  quizId: number | string,
  newQuestions = 1
): Promise<void> {
  const count = await getLiveQuestionCount(quizId);
  if (count + newQuestions > MAX_QUESTIONS_PER_QUIZ) {
    throw new QuizQuestionLimitError(
      `A quiz can have at most ${MAX_QUESTIONS_PER_QUIZ} questions. This quiz already has ${count}.`
    );
  }
}
