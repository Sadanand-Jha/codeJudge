/**
 * Test Section Generation Service
 *
 * Pipeline: PDF → Docling extraction → LLM streaming (logged to terminal) → Zod validation
 */
import { z } from "zod";
import { streamChatWithAI } from "./ai.service.js";
import type { LiveUsage } from "./ai.service.js";
import {
  extractTextWithDocling,
  isDoclingAvailable,
} from "./docling-extract.service.js";

/* ================================================================== */
/*  Zod schemas                                                        */
/* ================================================================== */

/*  Zod schemas — lenient to handle LLM sending strings, extra fields, etc. */

const AttemptRuleSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return { type: "ALL", count: null };
    const obj = raw as Record<string, unknown>;
    let type = String(obj.type ?? "ALL").toUpperCase().trim();
    let count = obj.count != null ? Number(obj.count) : null;

    // "ANY_2" → type=ANY_N, count=2
    const anyMatch = type.match(/^ANY_(\d+)$/);
    if (anyMatch) {
      type = "ANY_N";
      count = count ?? parseInt(anyMatch[1], 10);
    }

    // "ALL" with count 0 → treat as ALL with null
    if (type === "ALL") count = null;

    return { type, count };
  },
  z.object({
    type: z.enum(["ALL", "ANY_N", "COMPULSORY_PLUS_OPTIONAL"]),
    count: z.number().int().nonnegative().nullable().optional().default(null),
  })
);

const QuestionGroupSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const obj = raw as Record<string, unknown>;
    const type = String(obj.type ?? "OTHER").toUpperCase().trim().replace(/[\s-]+/g, "_");
    const children = Array.isArray(obj.children)
      ? obj.children.map((c: any) => {
          if (!c || typeof c !== "object") return c;
          return {
            type: String(c.type ?? "OTHER").toUpperCase().trim().replace(/[\s-]+/g, "_"),
            content: String(c.content ?? "").trim(),
            marks: Number(c.marks ?? 1),
          };
        })
      : undefined;
    return {
      ...obj,
      name: String(obj.name ?? "").trim() || "Unnamed",
      type,
      questionCount: Number(obj.questionCount ?? 0),
      marksPerQuestion: Number(obj.marksPerQuestion ?? 0),
      children,
    };
  },
  z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    questionCount: z.number().int().nonnegative().default(0),
    marksPerQuestion: z.number().nonnegative().default(0),
    attemptRule: AttemptRuleSchema.optional(),
    children: z.array(z.object({
      type: z.string().min(1),
      content: z.string(),
      marks: z.number().nonnegative().default(1),
    })).optional(),
  })
);

const SectionInputSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const obj = raw as Record<string, unknown>;
    return {
      ...obj,
      name: String(obj.name ?? "").trim() || "Untitled Section",
      title: String(obj.title ?? "").trim(),
      instructions: String(obj.instructions ?? "").trim(),
      label: obj.label != null ? String(obj.label).trim() : undefined,
      order: obj.order != null ? Number(obj.order) : undefined,
      questionGroups: obj.questionGroups ?? obj.questionTypes ?? [],
    };
  },
  z.object({
    order: z.number().int().positive().optional(),
    label: z.string().optional(),
    name: z.string().min(1),
    title: z.string().optional().default(""),
    instructions: z.string().optional().default(""),
    questionGroups: z.array(QuestionGroupSchema).min(1),
  })
);

const AIResponseSchema = z.object({
  sections: z.array(SectionInputSchema).min(1),
});

export type AttemptRule = z.infer<typeof AttemptRuleSchema>;
export type QuestionGroup = z.infer<typeof QuestionGroupSchema>;
export type SectionInput = z.infer<typeof SectionInputSchema>;

/* ================================================================== */
/*  Normalised output types                                             */
/* ================================================================== */

export interface NormalizedQuestionGroup {
  name: string;
  type: string;
  questionCount: number;
  marksPerQuestion: number;
  availableMarks: number;
  attemptRule: AttemptRule;
  children?: Array<{ type: string; content: string; marks: number }>;
}

export interface NormalizedSection {
  id: null;
  order: number;
  label: string;
  name: string;
  title: string;
  instructions: string;
  questionGroups: NormalizedQuestionGroup[];
  totalQuestions: number;
  totalAvailableMarks: number;
  sectionMarks: number;
}

export interface SectionGenerationResult {
  sections: NormalizedSection[];
  extractedText: string;
  usage?: LiveUsage;
}

/* ================================================================== */
/*  Valid question-type enum values                                     */
/* ================================================================== */

const VALID_TYPES = new Set([
  "MCQ_SINGLE",
  "MCQ_MULTIPLE",
  "MCQ",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANK",
  "FILL_BLANKS",
  "FILL_IN_THE_BLANKS",
  "ONE_WORD",
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "VERY_SHORT_ANSWER",
  "NUMERICAL",
  "ASSERTION_REASON",
  "MATCHING",
  "MATCH_FOLLOWING",
  "CASE_BASED",
  "PASSAGE_BASED",
  "SOURCE_BASED",
  "DIAGRAM_BASED",
  "IMAGE_BASED",
  "MAP_BASED",
  "GRAPH_BASED",
  "TABLE_BASED",
  "CODING",
  "CODE_OUTPUT",
  "PROOF",
  "DERIVATION",
  "EXPERIMENTAL",
  "PRACTICAL",
  "DESCRIPTIVE",
  "DIFFERENTIATE",
  "EXPLAIN",
  "LIST",
  "ORDERING",
  "SEQUENCE",
  "REARRANGEMENT",
  "DICTIONARY",
  "CLOZE",
  "SUB_PART",
  "OPEN_ENDED",
  "DESIGN",
  "APPLICATION",
  "CRITICAL_THINKING",
  "ESSAY",
  "OTHER",
  "NESTED",
]);

const normalizeType = (t: string): string => {
  const upper = t.toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (VALID_TYPES.has(upper)) return upper;
  return "OTHER";
};

/* ================================================================== */
/*  LLM Prompt                                                         */
/* ================================================================== */

const SYSTEM_PROMPT = `You are an exam-paper structure analyzer. Your ONLY job is to return a JSON object describing the question-paper layout. You MUST follow these rules ABSOLUTELY:

CRITICAL RULES:
- Return ONLY raw JSON. Nothing else.
- Do NOT include <analysis>, <thinking>, or any XML/HTML tags.
- Do NOT include markdown code fences.
- Do NOT include any text, commentary, or explanation before or after the JSON.
- The first character of your response MUST be { and the last MUST be }.
- Do NOT calculate totalMarks — the system will compute it. Omit totalMarks fields entirely.
- Distinguish between total questions present and questions the student must attempt.
- If a section has compulsory + optional questions, use separate questionGroups.

AVAILABLE QUESTION TYPES (from question_types table):
Each question type has an id, code, description, and category. You MUST use the exact "type" code listed below:

| id  | code              | description                                                    | category   |
|-----|-------------------|----------------------------------------------------------------|------------|
| 1   | MCQ_SINGLE        | Single-correct multiple choice question                        | objective  |
| 2   | MCQ_MULTIPLE      | Multiple-correct multiple choice question                      | objective  |
| 3   | TRUE_FALSE        | True or false question                                         | objective  |
| 4   | FILL_IN_THE_BLANK | Fill in the blank question                                     | subjective |
| 5   | ONE_WORD          | Answer required in one word                                    | subjective |
| 6   | SHORT_ANSWER      | Short answer question                                          | subjective |
| 7   | LONG_ANSWER       | Long/descriptive answer question                               | subjective |
| 8   | VERY_SHORT_ANSWER | Very short answer question                                     | subjective |
| 9   | NUMERICAL         | Numerical/calculation based question                           | objective  |
| 10  | ASSERTION_REASON  | Assertion and reason based question                            | objective  |
| 11  | MATCHING          | Match items from two or more columns                           | objective  |
| 12  | CASE_BASED        | Case/passage based question                                    | composite  |
| 13  | PASSAGE_BASED     | Passage followed by one or more questions                      | composite  |
| 14  | SOURCE_BASED      | Question based on a provided source/document                   | composite  |
| 15  | DIAGRAM_BASED     | Question requiring interpretation of a diagram/figure          | composite  |
| 16  | IMAGE_BASED       | Question based on a provided image                             | composite  |
| 17  | MAP_BASED         | Question based on a map                                        | composite  |
| 18  | GRAPH_BASED       | Question based on a graph/chart                                | composite  |
| 19  | TABLE_BASED       | Question based on a provided table/data                        | composite  |
| 20  | CODING            | Programming/code writing or code completion question           | technical  |
| 21  | CODE_OUTPUT       | Predict or identify the output of code                         | technical  |
| 22  | PROOF             | Mathematical/theoretical proof question                        | subjective |
| 23  | DERIVATION        | Formula or mathematical derivation question                    | subjective |
| 24  | EXPERIMENTAL      | Experiment/practical procedure based question                  | subjective |
| 25  | PRACTICAL         | Practical/lab/application based question                       | subjective |
| 26  | DESCRIPTIVE       | General descriptive/explanatory question                       | subjective |
| 27  | DIFFERENTIATE     | Question asking to distinguish between concepts                | subjective |
| 28  | EXPLAIN           | Question requiring explanation of a concept/process            | subjective |
| 29  | LIST              | Question requiring a list of items/facts                       | subjective |
| 30  | ORDERING          | Arrange items/events/steps in the correct order                | objective  |
| 31  | SEQUENCE          | Identify or complete a sequence/pattern                        | objective  |
| 32  | REARRANGEMENT     | Rearrange words, sentences, equations, or items                | objective  |
| 33  | DICTIONARY        | Dictionary/reference-based question                            | objective  |
| 34  | CLOZE             | Cloze passage with multiple blanks                             | composite  |
| 35  | SUB_PART          | Nested sub-question belonging to a parent question             | structural |
| 36  | OPEN_ENDED        | Open-ended question with no fixed answer format                | subjective |
| 37  | DESIGN            | Design/create/construct something as the answer                | subjective |
| 38  | APPLICATION       | Apply a concept to solve a real-world/problem scenario         | subjective |
| 39  | CRITICAL_THINKING | Reasoning, analysis, evaluation, or critical thinking question | subjective |
| 40  | OTHER             | Fallback type for an unsupported or uncommon question format   | other      |
| 41  | NESTED            | This question contains more other types of questions           | other      |

SCHEMA:
{
  "sections": [
    {
      "order": 1,
      "label": "A",
      "name": "Section A",
      "title": "Objective Questions",
      "instructions": "Answer all questions.",
      "questionGroups": [
        {
          "name": "MCQ",
          "type": "MCQ_SINGLE",
          "questionCount": 10,
          "marksPerQuestion": 1,
          "attemptRule": { "type": "ALL", "count": null }
        }
      ]
    }
  ]
}

For NESTED question groups, use this schema:
{
  "name": "Passage Based",
  "type": "NESTED",
  "questionCount": 3,
  "marksPerQuestion": 0,
  "attemptRule": { "type": "ALL", "count": null },
  "children": [
    {
      "type": "MCQ_SINGLE",
      "content": "Sub-question text here",
      "marks": 1
    },
    {
      "type": "SHORT_ANSWER",
      "content": "Another sub-question",
      "marks": 2
    }
  ]
}

RULES:
1. Each section MUST have at least one questionGroup.
2. questionGroups can also be provided as "questionTypes" (either key works).
3. "type" MUST be one of the codes from the AVAILABLE QUESTION TYPES table above. Use the exact code (e.g. "MCQ_SINGLE", "TRUE_FALSE", "FILL_IN_THE_BLANK", "NESTED").
4. If the document says "attempt any N out of M", set attemptRule.type = "ANY_N" and attemptRule.count = N. The questionCount in that group is M (total present).
5. If all questions must be attempted, set attemptRule.type = "ALL" and count = null.
6. If a section has compulsory questions AND optional questions, create separate questionGroups for each.
7. Do NOT include totalMarks or totalQuestions at the section or group level — the system computes them.
8. If no clear structure is found, create a single section with one group based on the content.
9. "name" is a short identifier (e.g. "MCQ", "Short Answer", "Compulsory"). "title" is the section heading.
10. "instructions" should reflect what the document says about that section.
11. For NESTED type: "children" is an array of sub-questions. Each child has "type" (from the table), "content" (the sub-question text), and "marks". The "questionCount" for a NESTED group equals the number of children. "marksPerQuestion" should be 0 for NESTED (marks come from children).
12. You may use NESTED when the document has a passage/prompt followed by multiple related sub-questions of different types.`;

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const extractJson = (raw: string): string => {
  let s = raw;

  // Strip all thinking/reasoning/analysis blocks
  s = s.replace(/<(?:thinking|thought|reasoning|analysis)>[\s\S]*?<\/(?:thinking|thought|reasoning|analysis)>/gi, "");

  // Strip markdown fences
  s = s.replace(/```(?:json)?/gi, "").trim();

  // Find balanced JSON by counting braces
  const start = s.indexOf("{");
  if (start === -1) return s.trim();

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return s.trim();
  return s.slice(start, end + 1);
};

const computeGroupMarks = (g: NormalizedQuestionGroup) => {
  const available = g.questionCount * g.marksPerQuestion;
  if (g.attemptRule.type === "ALL" || !g.attemptRule.count) {
    return { availableMarks: available, attemptMarks: available };
  }
  const attemptCount = Math.min(g.attemptRule.count, g.questionCount);
  return { availableMarks: available, attemptMarks: attemptCount * g.marksPerQuestion };
};

/* ================================================================== */
/*  Main                                                               */
/* ================================================================== */

export const generateSectionsFromPDF = async (
  buffer: Buffer,
  filename: string
): Promise<SectionGenerationResult> => {
  // 1. Check Docling
  const doclingAvailable = await isDoclingAvailable();
  if (!doclingAvailable) {
    throw new Error("Document extraction service is unavailable. Please try again later.");
  }

  // 2. Extract text with Docling
  let extractedText: string;
  try {
    extractedText = await extractTextWithDocling(new Uint8Array(buffer), filename);
  } catch (err) {
    console.error("Docling extraction failed:", err);
    throw new Error("We couldn't extract content from this document. Please try another PDF.");
  }

  if (!extractedText?.trim()) {
    throw new Error("No usable content was found in this document.");
  }

  // 3. Truncate
  const truncated = extractedText.length > 150_000 ? extractedText.slice(0, 150_000) : extractedText;

  // 4. Stream LLM response and log to terminal
  const userMessage = `Analyze this document and return the question-paper structure as raw JSON only.\n\nDOCUMENT:\n${truncated}`;

  console.log("\n" + "=".repeat(80));
  console.log("[SECTION-GEN] Starting LLM streaming...");
  console.log("=".repeat(80));

  let fullContent = "";
  let fullReasoning = "";
  let usage: LiveUsage | undefined;

  try {
    const stream = streamChatWithAI([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ]);

    for await (const chunk of stream) {
      if (chunk.reasoning) {
        fullReasoning += chunk.reasoning;
        process.stdout.write(`\x1b[90m${chunk.reasoning}\x1b[0m`);
      }
      if (chunk.content) {
        fullContent += chunk.content;
        process.stdout.write(chunk.content);
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("[SECTION-GEN] Stream complete.");
    console.log("[SECTION-GEN] Reasoning length:", fullReasoning.length);
    console.log("[SECTION-GEN] Content length:", fullContent.length);
    console.log("=".repeat(80));

    if (fullReasoning) {
      console.log("\n--- REASONING ---");
      console.log(fullReasoning);
      console.log("--- END REASONING ---\n");
    }

    console.log("\n--- RAW LLM OUTPUT ---");
    console.log(fullContent);
    console.log("--- END RAW OUTPUT ---\n");

  } catch (err) {
    console.error("\n[SECTION-GEN] LLM stream failed:", err);
    throw new Error("We couldn't identify the test structure from this document.");
  }

  // 5. Parse JSON
  let parsed: unknown;
  try {
    const jsonStr = extractJson(fullContent);
    console.log("[SECTION-GEN] Extracted JSON string:");
    console.log(jsonStr);
    parsed = JSON.parse(jsonStr);
    console.log("[SECTION-GEN] Parsed successfully:", JSON.stringify(parsed, null, 2).slice(0, 500));
  } catch (parseErr) {
    console.error("[SECTION-GEN] First parse failed:", parseErr);
    console.error("[SECTION-GEN] Content that failed to parse:", fullContent);
    console.log("[SECTION-GEN] Retrying with stricter prompt...");
    try {
      let retryContent = "";
      const retryStream = streamChatWithAI([
        {
          role: "system",
          content: `Return ONLY a valid JSON object. No text, no analysis, no tags, no markdown fences. First char must be { last char must be }.`,
        },
        {
          role: "user",
          content: `Fix this broken JSON and return ONLY the corrected JSON object:\n\n${fullContent.slice(0, 6000)}`,
        },
      ]);

      for await (const chunk of retryStream) {
        if (chunk.content) {
          retryContent += chunk.content;
          process.stdout.write(chunk.content);
        }
      }

      console.log("\n[SECTION-GEN] Retry raw output:");
      console.log(retryContent);

      const retryJson = extractJson(retryContent);
      console.log("[SECTION-GEN] Retry extracted JSON:");
      console.log(retryJson);

      parsed = JSON.parse(retryJson);
      console.log("[SECTION-GEN] Retry parsed successfully");
    } catch (retryErr) {
      console.error("[SECTION-GEN] Retry also failed:", retryErr);
      throw new Error("The generated structure couldn't be validated. Please try again.");
    }
  }

  // 6. Validate with Zod
  console.log("[SECTION-GEN] Parsed object:", JSON.stringify(parsed, null, 2));
  const result = AIResponseSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[SECTION-GEN] Zod validation FAILED:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error("The generated structure couldn't be validated. Please try again.");
  }

  console.log("[SECTION-GEN] Zod validation passed. Sections:", result.data.sections.length);

  // 7. Normalize sections
  const normalizedSections: NormalizedSection[] = result.data.sections.map((raw, idx) => {
    const groups = raw.questionGroups
      .filter((g) => g.questionCount > 0 || (g.type === "NESTED" && g.children && g.children.length > 0))
      .map((g): NormalizedQuestionGroup => {
        const rule: AttemptRule = g.attemptRule
          ? { type: g.attemptRule.type, count: g.attemptRule.count ?? null }
          : { type: "ALL", count: null };

        const isNested = g.type === "NESTED";
        const children = g.children?.map((c) => ({
          type: normalizeType(c.type),
          content: c.content,
          marks: c.marks,
        }));

        // For NESTED: questionCount = children.length, availableMarks = sum of children marks
        const questionCount = isNested && children ? children.length : g.questionCount;
        const availableMarks = isNested && children
          ? children.reduce((sum, c) => sum + c.marks, 0)
          : g.questionCount * g.marksPerQuestion;

        return {
          name: g.name,
          type: normalizeType(g.type),
          questionCount,
          marksPerQuestion: isNested ? 0 : g.marksPerQuestion,
          availableMarks,
          attemptRule: rule,
          children,
        };
      });

    let totalQuestions = 0;
    let totalAvailableMarks = 0;
    let sectionMarks = 0;

    for (const g of groups) {
      totalQuestions += g.questionCount;
      totalAvailableMarks += g.availableMarks;
      const { attemptMarks } = computeGroupMarks(g);
      sectionMarks += attemptMarks;
    }

    return {
      id: null,
      order: raw.order ?? idx + 1,
      label: raw.label ?? String.fromCharCode(65 + idx),
      name: raw.name,
      title: raw.title ?? "",
      instructions: raw.instructions ?? "",
      questionGroups: groups,
      totalQuestions,
      totalAvailableMarks,
      sectionMarks,
    };
  });

  if (normalizedSections.length === 0) {
    throw new Error("No usable question-paper structure was found in this document.");
  }

  console.log("[SECTION-GEN] Normalized sections:");
  for (const s of normalizedSections) {
    console.log(`  ${s.label}: ${s.name} — ${s.questionGroups.length} groups, ${s.totalQuestions} Qs, ${s.sectionMarks} marks`);
  }
  console.log("=".repeat(80) + "\n");

  return { sections: normalizedSections, extractedText, usage };
};
