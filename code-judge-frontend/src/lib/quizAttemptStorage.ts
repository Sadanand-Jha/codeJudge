export type StoredAttemptAnswer = { option?: string; textAnswer?: string };
export type StoredAttemptAnswers = Record<number, StoredAttemptAnswer>;

const STORAGE_PREFIX = "byteclash_quiz_answers_";

export const quizAttemptStorageKey = (attemptId: number) => `${STORAGE_PREFIX}${attemptId}`;

export function readQuizAttemptAnswers(attemptId: number): StoredAttemptAnswers {
  try {
    const raw = localStorage.getItem(quizAttemptStorageKey(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { attemptId?: number; answers?: Record<string, StoredAttemptAnswer | string> };
    if (parsed.attemptId !== undefined && parsed.attemptId !== attemptId) return {};
    if (!parsed.answers || typeof parsed.answers !== "object") return {};

    const answers: StoredAttemptAnswers = {};
    for (const [problemId, answer] of Object.entries(parsed.answers)) {
      const id = Number(problemId);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (typeof answer === "string") answers[id] = { option: answer };
      else if (answer && typeof answer === "object") answers[id] = answer;
    }
    return answers;
  } catch {
    return {};
  }
}

export function writeQuizAttemptAnswers(attemptId: number, answers: StoredAttemptAnswers): void {
  localStorage.setItem(
    quizAttemptStorageKey(attemptId),
    JSON.stringify({ attemptId, answers, savedAt: new Date().toISOString() }),
  );
}

export function clearQuizAttemptAnswers(attemptId: number): void {
  localStorage.removeItem(quizAttemptStorageKey(attemptId));
}
