/** Fallback attempt window when a quiz has no configured end time. */
export const NO_END_ATTEMPT_DURATION_MS = 15 * 60_000;
export const NO_END_ATTEMPT_DURATION_MINUTES = 15;

type QuizTiming = { endtime?: string | Date | null; status?: string | null };
type AttemptTiming = {
  started_at?: string | Date | null;
  created_at?: string | Date | null;
};

function toTimestamp(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getAttemptStartedAtMs(attempt: AttemptTiming | null | undefined): number | null {
  return toTimestamp(attempt?.started_at) ?? toTimestamp(attempt?.created_at);
}

/**
 * A quiz end time is authoritative when configured. Otherwise each attempt
 * gets a fixed 15-minute window measured from when that attempt started.
 */
export function getQuizAttemptDeadlineMs(
  quiz: QuizTiming | null | undefined,
  attempt: AttemptTiming | null | undefined
): number | null {
  const quizEndsAtMs = toTimestamp(quiz?.endtime);
  if (quizEndsAtMs !== null) return quizEndsAtMs;

  const attemptStartedAtMs = getAttemptStartedAtMs(attempt);
  return attemptStartedAtMs === null
    ? null
    : attemptStartedAtMs + NO_END_ATTEMPT_DURATION_MS;
}

export function isQuizAttemptWindowClosed(
  quiz: QuizTiming | null | undefined,
  attempt: AttemptTiming | null | undefined,
  now = Date.now()
): boolean {
  if (String(quiz?.status ?? "").toLowerCase() === "ended") return true;
  const deadlineMs = getQuizAttemptDeadlineMs(quiz, attempt);
  return deadlineMs !== null && deadlineMs <= now;
}
