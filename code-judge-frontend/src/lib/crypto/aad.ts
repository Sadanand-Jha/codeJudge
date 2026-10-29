type Identifier = string | number;

function normalizeId(value: Identifier, label: string): string {
  const id = String(value ?? "").trim();
  if (id.length === 0) {
    throw new Error(`${label} is required for encryption context.`);
  }
  return id;
}

export const KEK_CHECK_AAD = "kek-check|v1";

export function questionPayloadAad(
  quizId: Identifier,
  questionId: Identifier
): string {
  return `quiz:${normalizeId(quizId, "Quiz id")}|q:${normalizeId(
    questionId,
    "Question id"
  )}|payload|v1`;
}

export function answerKeyAad(
  quizId: Identifier,
  questionId: Identifier
): string {
  return `quiz:${normalizeId(quizId, "Quiz id")}|q:${normalizeId(
    questionId,
    "Question id"
  )}|key|v1`;
}

export function wrappedDekAad(quizId: Identifier): string {
  return `quiz:${normalizeId(quizId, "Quiz id")}|dek|v1`;
}

export function studentResponseAad(
  quizId: Identifier,
  attemptId: Identifier,
  questionId: Identifier
): string {
  return `quiz:${normalizeId(quizId, "Quiz id")}|a:${normalizeId(
    attemptId,
    "Attempt id"
  )}|q:${normalizeId(questionId, "Question id")}|response|v1`;
}
