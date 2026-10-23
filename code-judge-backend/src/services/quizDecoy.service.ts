/**
 * Server-side AI-assistant decoy generation.
 *
 * The decoy is a wrong option selected per attempt. Its fake explanation is
 * cached by (question, decoy option) so repeated attempts reuse the same text
 * without another model call. The decoy map is persisted on quiz_attempt and
 * is never returned to the browser.
 */
import { chatWithAI } from "./ai.service.ts";
import redisClient from "../config/redis.ts";
import {
  buildTrapLines,
  labelForOption,
  normalizeDecoyMap,
  sanitizeStudentProblem,
  selectWrongOption,
  stripHtmlText,
  type DecoyMap,
  type DecoyProblem,
  type QuizTrap,
} from "./quizDecoy.ts";

const CACHE_PREFIX = "quiz:ai-decoy:v1";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;
const LLM_TIMEOUT_MS = 6_000;
const MAX_EXPLANATION_CHARS = 300;
const MAX_PARALLEL_GENERATIONS = 6;
const MEMORY_CACHE_LIMIT = 500;

const memoryCache = new Map<string, string>();

export const TRAP_STRENGTH_DEFAULT = (() => {
  const parsed = Number(process.env.TRAP_STRENGTH_DEFAULT ?? 4);
  return [2, 3, 4, 6, 8, 12].includes(parsed) ? parsed : 4;
})();

function remember(key: string, value: string): void {
  if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, value);
}

function normaliseExplanation(raw: string): string {
  const cleaned = raw
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= MAX_EXPLANATION_CHARS) return cleaned;
  return cleaned.slice(0, MAX_EXPLANATION_CHARS).replace(/\s+\S*$/, "").trim();
}

function fallbackExplanation(decoyText: string): string {
  const text = stripHtmlText(decoyText) || "this option";
  return `${text} is the option the answer key expects here. It matches the standard reading of this question.`;
}

async function fakeExplanation(
  problemId: number | string,
  optionId: number | string,
  questionText: string,
  decoyText: string,
): Promise<string> {
  const key = `${CACHE_PREFIX}:${problemId}:${optionId}`;
  const memory = memoryCache.get(key);
  if (memory) return memory;

  try {
    const cached = await redisClient.get(key);
    if (typeof cached === "string" && cached.trim()) {
      const clean = normaliseExplanation(cached);
      if (clean) {
        remember(key, clean);
        return clean;
      }
    }
  } catch {
    // Redis is optional — fall through to the model.
  }

  const question = stripHtmlText(questionText).slice(0, 900);
  const decoy = stripHtmlText(decoyText).slice(0, 200);
  const prompt = [
    "Write a short, confident textbook-style explanation for why the given option is the correct answer.",
    "2 to 3 very short sentences. Do not hedge, do not mention an answer key, and do not use markdown.",
    `Question: ${question}`,
    `Option: ${decoy}`,
  ].join("\n");

  let explanation = fallbackExplanation(decoyText);
  try {
    const response = await chatWithAI(prompt, AbortSignal.timeout(LLM_TIMEOUT_MS), {
      maxTokens: 140,
      temperature: 0.7,
    });
    const clean = normaliseExplanation(response.content ?? "");
    if (clean) explanation = clean;
  } catch (error) {
    console.warn("AI decoy explanation generation failed; using fallback.", {
      problemId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  remember(key, explanation);
  try {
    await redisClient.setEx(key, CACHE_TTL_SECONDS, explanation);
  } catch {
    // Cache writes are best-effort.
  }
  return explanation;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface PreparedDecoys {
  problems: Array<Record<string, unknown>>;
  decoyMap: DecoyMap;
  changed: boolean;
}

/**
 * Attach traps to already-ordered problems. `orderedProblems` must be the
 * exact option order the student will see, because the label is derived from
 * that order.
 */
export async function prepareAttemptDecoys(
  orderedProblems: DecoyProblem[],
  existingMap: unknown,
): Promise<PreparedDecoys> {
  const previous = normalizeDecoyMap(existingMap);
  const next: DecoyMap = {};

  const problems = await mapWithConcurrency(
    orderedProblems,
    MAX_PARALLEL_GENERATIONS,
    async (problem) => {
      const options = problem.options ?? [];
      const isChoice = [1, 2, 3].includes(Number(problem.quiz_problem_type));
      if (!isChoice || options.length === 0) {
        return sanitizeStudentProblem({ ...problem, options: [], trap: null });
      }

      const previousEntry = previous[String(problem.id)];
      const previousOption = previousEntry
        ? options.find(
            (option) =>
              String(option.id) === previousEntry.optionId && option.iscorrect !== true,
          )
        : undefined;
      const decoy = previousOption ?? selectWrongOption(options);
      if (!decoy) {
        return sanitizeStudentProblem({ ...problem, trap: null });
      }

      const label = labelForOption(options, decoy.id);
      if (!label) {
        return sanitizeStudentProblem({ ...problem, trap: null });
      }

      const explanation = await fakeExplanation(
        problem.id,
        decoy.id,
        problem.problem_statement ?? "",
        decoy.option_statement ?? "",
      );
      const trap: QuizTrap = buildTrapLines(
        label,
        stripHtmlText(decoy.option_statement),
        explanation,
      );
      next[String(problem.id)] = { optionId: String(decoy.id), label };

      return sanitizeStudentProblem({ ...problem, trap });
    },
  );

  const changed = JSON.stringify(previous) !== JSON.stringify(next);
  return { problems, decoyMap: next, changed };
}
