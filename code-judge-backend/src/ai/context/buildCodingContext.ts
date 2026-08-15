/**
 * Context construction — builds the trusted problem/code context that is sent
 * to the model alongside the private system prompt.
 *
 * The problem is always fetched from the database keyed by `problemId`; the
 * client cannot supply authoritative problem content. User-supplied code is
 * treated as untrusted data (it may contain prompt-injection attempts) and is
 * wrapped so it can never be interpreted as instructions.
 */
import { ProblemRepository } from "../../repositories/problem.repository.ts";
import type { ProblemDetail } from "../../types/index.ts";

/** Where the user's selected region starts/ends (1-based Monaco coords). */
export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/** Dynamic, non-authoritative input the frontend may send. */
export interface CodeContextInput {
  code?: string;
  language?: string;
  filename?: string;
  selection?: string;
  selectionRange?: SelectionRange;
}

/** Minimal HTML → plain text (strip tags + decode common entities). */
const htmlToText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const stripCodeFences = (value: string): string => value.replace(/```/g, "```");

/**
 * Retrieve the problem from the DB and render only the information the model
 * needs: title, statement, input/output spec, constraints, notes, examples.
 * Returns null when the problem does not exist or the DB is unreachable (the
 * caller proceeds without problem context rather than failing the request).
 */
export const buildProblemContext = async (
  problemId: string
): Promise<string | null> => {
  try {
    const repo = new ProblemRepository();
    const problem: ProblemDetail | null = await repo.getProblemByProblemId(problemId);
    if (!problem) return null;

    const parts: string[] = [];
    parts.push(`Problem: ${problem.title}`);

    const statement = htmlToText(problem.statement);
    if (statement) parts.push(`\nStatement:\n${statement}`);

    const input = htmlToText(problem.input_specification);
    if (input) parts.push(`\nInput format:\n${input}`);

    const output = htmlToText(problem.output_specification);
    if (output) parts.push(`\nOutput format:\n${output}`);

    if (problem.constraints) {
      const constraints = htmlToText(problem.constraints);
      if (constraints) parts.push(`\nConstraints:\n${constraints}`);
    }

    if (problem.notes) {
      const notes = htmlToText(problem.notes);
      if (notes) parts.push(`\nNote:\n${notes}`);
    }

    if (problem.sample_tests.length > 0) {
      const examples = problem.sample_tests
        .map(
          (t, i) =>
            `Example ${i + 1}:\nInput:\n${stripCodeFences(t.input)}\nOutput:\n${stripCodeFences(
              t.output
            )}${t.explanation ? `\nExplanation:\n${t.explanation}` : ""}`
        )
        .join("\n\n");
      if (examples) parts.push(`\nExamples:\n${examples}`);
    }

    return parts.join("\n");
  } catch (error) {
    console.error(`[ai] failed to load problem context for "${problemId}"`, error);
    return null;
  }
};

/**
 * Render the user's current code as untrusted context. The code is fenced and
 * explicitly labeled so the model treats it as data, never as instructions.
 */
export const buildCodeContext = (input: CodeContextInput): string => {
  const filename = input.filename || "solution";
  const language = input.language || "";

  const parts: string[] = [];
  parts.push("--- Current file ---");
  parts.push(`Filename: ${filename}`);
  if (language) parts.push(`Language: ${language}`);
  parts.push("");
  parts.push("```" + language);
  parts.push(input.code ?? "");
  parts.push("```");

  if (input.selection && input.selectionRange) {
    const s = input.selectionRange;
    parts.push(
      `\nThe user has selected code from line ${s.startLine} col ${s.startColumn} to line ${s.endLine} col ${s.endColumn}. Prefer to modify this selected region when the request applies to it.`
    );
    parts.push("");
    parts.push("```" + language);
    parts.push(input.selection);
    parts.push("```");
  }

  return parts.join("\n");
};

export interface BuildContextResult {
  problemId?: string;
  context: string;
}

/**
 * Combine problem context (DB, trusted) and code context (untrusted) into a
 * single context message. Never contains system-instruction material.
 */
export const buildContextMessage = async (
  problemId: string | undefined,
  codeInput: CodeContextInput
): Promise<BuildContextResult> => {
  const blocks: string[] = [];

  if (problemId) {
    const problemContext = await buildProblemContext(problemId);
    if (problemContext) blocks.push(problemContext);
  }

  const codeContext = buildCodeContext(codeInput);
  if (codeContext.trim()) blocks.push(codeContext);

  return {
    problemId,
    context: blocks.join("\n\n---\n\n"),
  };
};