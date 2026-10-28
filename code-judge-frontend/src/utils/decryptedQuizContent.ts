import type { PublicQuizProblem, QuestionReview } from "@/services/quiz";
import type { UnlockedQuiz } from "@/lib/quizCrypto";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

export interface DecryptedOptionContent {
  id: string;
  content: string;
  contentHtml: string;
  caption: string;
  isCorrect: boolean;
}

export interface DecryptedQuestionContent {
  id: string;
  serverId: string;
  type: string;
  title: string;
  description: string;
  explanation: string;
  hint: string;
  options: DecryptedOptionContent[];
  correctAnswer: unknown;
  raw: UnknownRecord;
}

export interface DecryptedQuizIndex {
  questions: DecryptedQuestionContent[];
  byId: Map<string, DecryptedQuestionContent>;
  problemHtml: Record<string, string>;
}

/**
 * Index the decrypted browser payload by every id the server may send back:
 * the numeric server id, the local creator id, and the positional fallback.
 */
export function buildDecryptedQuizIndex(unlocked: UnlockedQuiz): DecryptedQuizIndex {
  const problems = Array.isArray(unlocked.questions) ? unlocked.questions : [];
  const questions: DecryptedQuestionContent[] = [];
  const byId = new Map<string, DecryptedQuestionContent>();

  problems.forEach((value, index) => {
    const raw = asRecord(value);
    if (!raw) return;
    const localId = raw.id !== undefined && raw.id !== null ? String(raw.id) : "";
    const serverId =
      raw.serverId !== undefined && raw.serverId !== null ? String(raw.serverId) : "";
    const key = serverId || localId;
    const html =
      unlocked.problemHtml[serverId] ??
      unlocked.problemHtml[localId] ??
      unlocked.problemHtml[key] ??
      "";
    const options = (Array.isArray(raw.options) ? raw.options : [])
      .map((option, optionIndex): DecryptedOptionContent | null => {
        const record = asRecord(option);
        if (!record) return null;
        return {
          id: record.id !== undefined && record.id !== null
            ? String(record.id)
            : `${key}:option:${optionIndex}`,
          content: asString(record.content),
          contentHtml: asString(record.contentHtml),
          caption: asString(record.caption),
          isCorrect: asBoolean(record.isCorrect),
        };
      })
      .filter((option): option is DecryptedOptionContent => option !== null);

    const question: DecryptedQuestionContent = {
      id: key,
      serverId,
      type: asString(raw.type) || "single_choice",
      title: html || asString(raw.title),
      description: asString(raw.topic),
      explanation: asString(raw.explanation),
      hint: asString(raw.hint),
      options,
      correctAnswer: raw.correctAnswer,
      raw,
    };
    questions.push(question);
    if (serverId) byId.set(serverId, question);
    if (localId) byId.set(localId, question);
    byId.set(`#${index}`, question);
  });

  return { questions, byId, problemHtml: unlocked.problemHtml };
}

export function findDecryptedQuestion(
  index: DecryptedQuizIndex,
  problemId: string | number,
  position: number
): DecryptedQuestionContent | null {
  return (
    index.byId.get(String(problemId)) ??
    index.questions[position] ??
    null
  );
}

/**
 * Merge decrypted text back into the id/order-only attempt payload. The server
 * remains the source of truth for question order and option shuffle order.
 */
export function mergeAttemptProblems(
  problems: PublicQuizProblem[],
  index: DecryptedQuizIndex
): PublicQuizProblem[] {
  return problems.map((problem, position) => {
    const authoredPosition =
      typeof problem.authored_index === "number"
        ? problem.authored_index
        : position;
    const question = findDecryptedQuestion(index, problem.id, authoredPosition);
    if (!question) return problem;
    const optionsById = new Map(question.options.map((option) => [option.id, option]));
    const options = (problem.options ?? []).map((option, optionIndex) => {
      const authoredOptionIndex =
        typeof option.authored_index === "number"
          ? option.authored_index
          : optionIndex;
      const local =
        optionsById.get(String(option.id)) ??
        question.options[authoredOptionIndex] ??
        question.options[optionIndex];
      return {
        ...option,
        option_statement: local ? local.contentHtml || local.content : "",
        option_description: local?.caption || null,
      };
    });
    return {
      ...problem,
      problem_statement: question.title,
      problem_description: question.description || problem.problem_description,
      options,
    };
  });
}

/**
 * Merge decrypted text into the sanitized attempt-review rows. Correctness
 * flags still come from the server; the browser only restores the authored
 * question/option strings and explanation.
 */
export function mergeReviewRows(
  rows: QuestionReview[],
  index: DecryptedQuizIndex
): QuestionReview[] {
  return rows.map((row, position) => {
    const question = findDecryptedQuestion(index, row.problem_id, position);
    if (!question) return row;

    const optionsById = new Map(question.options.map((option) => [option.id, option]));
    let options = (row.options ?? []).map((option, optionIndex) => {
      const local = optionsById.get(String(option.id)) ?? question.options[optionIndex];
      return {
        ...option,
        option_statement: local ? local.contentHtml || local.content : "",
      };
    });
    if (options.length === 0 && question.options.length > 0) {
      options = question.options.map((option, optionIndex) => {
        const numericId = Number(option.id);
        return {
          id: Number.isFinite(numericId) && numericId > 0 ? numericId : -(optionIndex + 1),
          option_statement: option.contentHtml || option.content,
          iscorrect: option.isCorrect,
        };
      });
    }

    const correctOption = options.find((option) => option.iscorrect === true);
    const plainAnswer =
      typeof question.correctAnswer === "string" || typeof question.correctAnswer === "number"
        ? String(question.correctAnswer)
        : Array.isArray(question.correctAnswer)
          ? question.correctAnswer.map(String).join(", ")
          : "";

    return {
      ...row,
      problem_statement: question.title,
      problem_description: question.description || row.problem_description,
      explaination: question.explanation || row.explaination,
      hint: question.hint || row.hint,
      options,
      correct_answer: correctOption?.option_statement || plainAnswer || null,
    };
  });
}
