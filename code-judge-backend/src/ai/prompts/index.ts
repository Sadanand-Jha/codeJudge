/**
 * AI prompt registry — the single place that maps an AI "mode" to its
 * backend-controlled system prompt.
 *
 * The registry is deliberately extensible: new modes (code_debugger,
 * problem_explainer, editorial_explainer, code_reviewer, ai_analysis, …) are
 * added here without duplicating prompt logic across API routes.
 */
import { CODING_COACH_FULL_PROMPT, CODING_COACH_SYSTEM_PROMPT } from "./codingCoach.ts";
import { GENERAL_SYSTEM_PROMPT } from "./general.ts";

export type AIMode =
  | "general"
  | "coding_coach"
  | "code_debugger"
  | "problem_explainer"
  | "editorial_explainer"
  | "code_reviewer"
  | "ai_analysis";

/** All modes that operate on a code file (they get the edit guide appended). */
const CODE_MODES: ReadonlySet<AIMode> = new Set([
  "coding_coach",
  "code_debugger",
  "code_reviewer",
]);

/** Debugger variant of the edit guide (bug-focused but same diff contract). */
const EDIT_GUIDE_DEBUGGER = `
You are a code debugger. Identify the root cause of the bug, explain why it happens, then fix it.
Prefer targeted fixes over rewriting the whole file.

When you modify code, present ONLY the changed lines as a standard unified diff inside a fenced \`\`\`diff block:
- Start with a hunk header: @@ -<startLine>,<count> +<startLine>,<count> @@ (1-based line numbers)
- "-" lines are removed, "+" lines are added, space-prefixed lines are context.
- NEVER include the entire file.
`.trim();

/** Reviewer variant of the edit guide (same diff contract as the coach). */
const EDIT_GUIDE_REVIEWER = `
You are a code reviewer. Review the user's code for correctness, edge cases, readability and performance.
Praise what works, then list concrete issues with why they matter.

When you propose changes, present ONLY the changed lines as a standard unified diff inside a fenced \`\`\`diff block:
- Start with a hunk header: @@ -<startLine>,<count> +<startLine>,<count> @@ (1-based line numbers)
- "-" lines are removed, "+" lines are added, space-prefixed lines are context.
- NEVER include the entire file.
`.trim();

const PROMPTS: Record<AIMode, string> = {
  general: GENERAL_SYSTEM_PROMPT,
  coding_coach: CODING_COACH_FULL_PROMPT,
  code_debugger: `${CODING_COACH_SYSTEM_PROMPT}

${EDIT_GUIDE_DEBUGGER}`,
  problem_explainer: `${CODING_COACH_SYSTEM_PROMPT}

You are focusing on explaining problems and their statements. Explain the problem, the input/output format, and the constraints clearly. Do not rush to the solution.`,
  editorial_explainer: `${CODING_COACH_SYSTEM_PROMPT}

You are explaining editorials. Break down the intended solution, complexity, and edge cases. Help the user understand WHY the editorial approach works.`,
  code_reviewer: `${CODING_COACH_SYSTEM_PROMPT}

${EDIT_GUIDE_REVIEWER}`,
  ai_analysis: `${CODING_COACH_SYSTEM_PROMPT}

You are performing a structured analysis of a problem and the user's attempt. Cover difficulty, required concepts, common mistakes, and a recommended next step. Keep it organized and concise.`,
};

/** Whether a mode should receive the code-file context block. */
export const modeUsesCodeContext = (mode: AIMode): boolean =>
  CODE_MODES.has(mode) || mode === "ai_analysis";

/**
 * Returns the private system prompt for a mode. Unknown/missing modes fall
 * back to the general assistant prompt.
 */
export const getSystemPrompt = (mode?: AIMode | string): string => {
  if (mode && mode in PROMPTS) return PROMPTS[mode as AIMode];
  return PROMPTS.general;
};

/**
 * Assemble the full, structured conversation handed to the model:
 *
 *   system instructions (private)
 *   ↓
 *   problem/code context (trusted, retrieved server-side)
 *   ↓
 *   previous conversation (truncated)
 *   ↓
 *   current user message
 *
 * Content originating from the user (their message, code comments, pasted
 * text) is treated as untrusted data in the "context"/history slots — it can
 * never replace the system message.
 */
export interface BuildMessagesInput {
  system: string;
  context?: string;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

export const buildMessages = (
  input: BuildMessagesInput
): { role: "system" | "user" | "assistant"; content: string }[] => {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: input.system },
  ];
  if (input.context) {
    messages.push({ role: "user", content: input.context });
  }
  for (const m of input.history) {
    messages.push(m);
  }
  messages.push({ role: "user", content: input.userMessage });
  return messages;
};