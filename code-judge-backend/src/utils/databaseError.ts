/** PostgreSQL failures that are transient infrastructure/capacity problems. */
const RETRYABLE_DATABASE_CODES = new Set([
  "53300", // too_many_connections
  "57P03", // cannot_connect_now
  "08000", "08001", "08003", "08004", "08006", "08007", "08P01", // connection exceptions
]);

/** Unique-violation on the quiz code column (`uq_quiz_code`). */
export function isQuizCodeConflictError(error: unknown): boolean {
  const value = error as { code?: string; constraint?: string; detail?: string; message?: string } | null;
  if (String(value?.code ?? "") !== "23505") return false;
  const haystack = [value?.constraint, value?.detail, value?.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("uq_quiz_code") || haystack.includes("(code)");
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const value = error as { code?: string; message?: string } | null;
  const code = String(value?.code ?? "");
  const message = String(value?.message ?? "").toLowerCase();
  return RETRYABLE_DATABASE_CODES.has(code) ||
    message.includes("remaining connection slots") ||
    message.includes("too many connections") ||
    message.includes("connection terminated unexpectedly");
}
