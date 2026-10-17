// Per-quiz question cap — shared business logic for every question creation
// path (single add, bulk save, duplicate) across the user and admin stacks.
// Limits are enforced here so no client can bypass them; the frontend only
// surfaces the error when the cap is hit.
//
// The cap is resolved from the quiz owner's subscription entitlements
// (`max_questions_per_quiz`, -1 = unlimited); the free plan defaults to
// MAX_QUESTIONS_PER_QUIZ.
import { pool } from "../config/database.ts";
import { assertLimit } from "./entitlement.service.ts";

/** Free-plan fallback for the entitlement-backed per-quiz question cap. */
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

/** Owner of the quiz — entitlements are resolved against the owner's plan. */
async function getQuizOwnerId(quizId: number | string): Promise<number | null> {
  const result = await pool.query("SELECT createdby FROM quiz WHERE id = $1", [quizId]);
  const owner = result.rows[0]?.createdby;
  if (owner == null) return null;
  const ownerId = Number(owner);
  return Number.isFinite(ownerId) ? ownerId : null;
}

/**
 * Enforce the per-quiz question cap against the quiz owner's plan. Resolves
 * silently when `newQuestions` more questions fit, otherwise throws
 * EntitlementLimitError (mapped to 403 + upgrade prompt by controllers).
 * A missing quiz resolves silently — the caller's own 404 handling applies.
 */
export async function assertQuestionsCanBeAdded(
  quizId: number | string,
  newQuestions = 1
): Promise<void> {
  const [count, ownerId] = await Promise.all([
    getLiveQuestionCount(quizId),
    getQuizOwnerId(quizId),
  ]);
  if (ownerId === null) return;
  await assertLimit(ownerId, "max_questions_per_quiz", count, newQuestions);
}
