// Quiz creation limits — shared business logic for every quiz creation path
// (creator studio, user API, cloning). Limits are enforced here so no client
// can bypass them; the frontend only surfaces the error when a limit is hit.
import { pool } from "../config/database.ts";

/** Maximum quizzes a single user may own at any time. */
export const MAX_QUIZZES_PER_USER = 10;

/** Maximum quizzes a single user may create per calendar day (IST). */
export const MAX_QUIZZES_PER_DAY = 2;

/** Minimum gap between two quiz creations by the same user, in minutes. */
export const MIN_MINUTES_BETWEEN_QUIZZES = 2;

export type QuizCreationLimitCode =
  | "MAX_QUIZZES"
  | "DAILY_LIMIT"
  | "COOLDOWN";

/**
 * Thrown when a quiz creation request violates one of the creation limits.
 * Controllers map this to HTTP 429 with the message shown to the user.
 */
export class QuizCreationLimitError extends Error {
  code: QuizCreationLimitCode;
  /** Seconds the client should wait before retrying (cooldown only). */
  retryAfterSeconds?: number;

  constructor(code: QuizCreationLimitCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "QuizCreationLimitError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface QuizCreationStats {
  total: number;
  today: number;
  lastCreatedAt: Date | null;
}

async function getQuizCreationStats(userId: number): Promise<QuizCreationStats> {
  // The day boundary is computed in Asia/Kolkata so "2 per day" follows IST
  // regardless of the database session timezone.
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE created_at >= (
           date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'
         )
       )::int AS today,
       MAX(created_at) AS last_created_at
     FROM quiz
     WHERE createdby = $1`,
    [userId]
  );
  const row = result.rows[0] as {
    total: number;
    today: number;
    last_created_at: string | Date | null;
  };
  return {
    total: row.total,
    today: row.today,
    lastCreatedAt: row.last_created_at ? new Date(row.last_created_at) : null,
  };
}

/**
 * Enforce quiz creation limits for a user. Resolves silently when creation
 * is allowed, otherwise throws QuizCreationLimitError describing the exact
 * rule that was violated.
 */
export async function assertQuizCreationAllowed(userId: number): Promise<void> {
  const stats = await getQuizCreationStats(userId);

  if (stats.total >= MAX_QUIZZES_PER_USER) {
    throw new QuizCreationLimitError(
      "MAX_QUIZZES",
      `You have reached the maximum of ${MAX_QUIZZES_PER_USER} quizzes. Delete a quiz to create a new one.`
    );
  }

  if (stats.today >= MAX_QUIZZES_PER_DAY) {
    throw new QuizCreationLimitError(
      "DAILY_LIMIT",
      `You can create only ${MAX_QUIZZES_PER_DAY} quizzes per day. Please try again tomorrow.`
    );
  }

  if (stats.lastCreatedAt) {
    const elapsedMs = Date.now() - stats.lastCreatedAt.getTime();
    const waitMs = MIN_MINUTES_BETWEEN_QUIZZES * 60 * 1000 - elapsedMs;
    if (waitMs > 0) {
      const waitMinutes = Math.ceil(waitMs / 60000);
      throw new QuizCreationLimitError(
        "COOLDOWN",
        `Please wait ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"} before creating another quiz.`,
        Math.ceil(waitMs / 1000)
      );
    }
  }
}
