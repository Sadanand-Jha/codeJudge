/**
 * Question Paper Generation Service — build a full question paper from
 * created sections.
 *
 * Pipeline: sections JSON (+ optional scope/syllabus) → AI writes original
 * questions → server validates counts/marks and sanitizes HTML → printable
 * paper. The legacy subjective bank is not used for generation.
 *
 * Totals/marks are computed server-side, mirroring testSectionGeneration.
 */
import { z } from "zod";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import * as cheerio from "cheerio";
import { chatWithAI } from "./ai.service.js";
import type { LiveUsage } from "./ai.service.js";
import { pool as db } from "../config/database.js";
import { sanitizeQuestionHtml } from "./subjectiveQuestionImport.service.js";
import {
  formatQuestionScope,
  loadQuestionScope,
  questionScopeTaggingRules,
  resolveQuestionScopeIds,
} from "./question-scope.service.js";
import type {
  QuestionScopeCatalog,
  QuestionScopeFallback,
} from "./question-scope.service.js";

/* ================================================================== */
/*  Input / output types                                                */
/* ================================================================== */

export interface PaperGroupInput {
  name?: string;
  type: string;
  questionCount: number;
  marksPerQuestion: number;
  attemptRule?: { type: string; count?: number | null } | string;
}

export interface PaperSectionInput {
  order?: number;
  label?: string;
  name: string;
  title?: string;
  instructions?: string;
  questionGroups: PaperGroupInput[];
}

export type OverallDifficulty = "easy" | "balanced" | "challenging";

/** Difficulty levels allowed for each overall paper profile. */
const OVERALL_DIFFICULTY_POOL: Record<OverallDifficulty, string[]> = {
  easy: ["easy", "medium"],
  balanced: ["easy", "medium", "hard"],
  challenging: ["medium", "hard"],
};

/** Prompt guidance describing the overall paper tone (never percentages). */
const OVERALL_DIFFICULTY_GUIDANCE: Record<OverallDifficulty, string> = {
  easy: "Create a direct, basic paper. Use straightforward single-concept questions: definitions, direct recall, simple explanations and one-step problems. Keep wording plain and avoid multi-concept synthesis, trick questions, long derivations and unnecessarily deep reasoning. Higher-mark questions may need a slightly fuller answer, but must still be basic and easy to attempt.",
  balanced: "Create a balanced, approachable paper: a mix of foundational and moderate questions with some application. You may link concepts where marks justify it, but do not make the whole paper challenging; keep most questions comfortably attemptable and use harder reasoning only sparingly.",
  challenging: "Create a demanding paper with greater emphasis on application, analysis and deeper reasoning. Deliberately include questions that combine two or more concepts, require multi-step thinking, or ask students to compare, derive, evaluate or apply ideas in unfamiliar situations. Keep every question within scope and the time budget.",
};

const preferredDifficulty = (marksPerQuestion: number): "easy" | "medium" | "hard" =>
  marksPerQuestion <= 2 ? "easy" : marksPerQuestion <= 5 ? "medium" : "hard";

/** Difficulty target derived from marks, the overall tone and any legacy hint. */
const targetDifficulty = (
  marksPerQuestion: number,
  overall: OverallDifficulty | null,
  legacy: "any" | "easy" | "medium" | "hard"
): "easy" | "medium" | "hard" => {
  const suggested = preferredDifficulty(marksPerQuestion);
  if (overall === "easy") return "easy";
  if (overall === "balanced") return suggested === "hard" ? "medium" : suggested;
  if (overall === "challenging") {
    return OVERALL_DIFFICULTY_POOL.challenging.includes(suggested) ? suggested : "medium";
  }
  return legacy === "any" ? suggested : legacy;
};

const groupKind = (type: string, legacyKind: string): "Theory" | "Numerical" => {
  const t = type.toUpperCase();
  if (t === "NUMERICAL") return "Numerical";
  if (t === "THEORY" || t === "SUBJECTIVE") return "Theory";
  return legacyKind === "numerical" ? "Numerical" : "Theory";
};

export interface GeneratePaperRequest {
  sections: PaperSectionInput[];
  title?: string;
  instructions?: string;
  /** Free-form syllabus/topics used by the AI to scope generated questions. */
  syllabus?: string;
  durationMinutes?: number;
  subjectId: number;
  chapterId?: number | null;
  topicId?: number | null;
  chapterIds?: number[];
  topicIds?: number[];
  /** Paper-level tone. When present, the AI decides kinds itself (kind is ignored). */
  overallDifficulty?: OverallDifficulty;
  /** Legacy per-question filters (used only when overallDifficulty is absent). */
  difficulty?: "any" | "easy" | "medium" | "hard";
  kind?: "any" | "theory" | "numerical";
}

export interface PaperQuestion {
  num: number;
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
  marks: number;
  /** Curriculum ids assigned to this question by the AI. */
  subjectId?: number;
  chapterId?: number | null;
  topicId?: number | null;
  /** Bank row created for this question; used to track PDF downloads. */
  bankQuestionId?: number | null;
}

export interface PaperGroup {
  name: string;
  type: string;
  marksPerQuestion: number;
  attemptRule: { type: string; count: number | null };
  questions: PaperQuestion[];
}

export interface PaperSection {
  order: number;
  label: string;
  name: string;
  title: string;
  instructions: string;
  questionGroups: PaperGroup[];
  totalQuestions: number;
  totalAvailableMarks: number;
  sectionMarks: number;
}

export interface QuestionPaper {
  title: string;
  instructions: string;
  syllabus: string;
  sections: PaperSection[];
  totalQuestions: number;
  totalMarks: number;
  durationMinutes?: number;
}

export interface GeneratePaperResult {
  paper: QuestionPaper;
  usage?: LiveUsage;
}

/* ================================================================== */
/*  Single question picker (teacher: N questions, hardness split, topic) */
/* ================================================================== */

export interface GenerateSubjectiveQuestionsRequest {
  numberOfQuestions: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  theoryCount?: number;
  numericalCount?: number;
  reasoningEffort?: "plus" | "pro" | "max";
  /** Topic / syllabus used by the AI to scope generated questions. */
  syllabus?: string;
  kind?: "any" | "theory" | "numerical";
  subjectId: number;
  chapterId?: number | null;
  topicId?: number | null;
  chapterIds?: number[];
  topicIds?: number[];
}

export interface SubjectiveQuestion {
  num: number;
  question: string;
  questionHtml?: string | null;
  difficulty: string;
  kind: string;
  /** Curriculum ids assigned to this question by the AI. */
  subjectId?: number;
  chapterId?: number | null;
  topicId?: number | null;
  /** Bank row created for this question; used to track PDF downloads. */
  bankQuestionId?: number | null;
}

export interface GenerateSubjectiveQuestionsResult {
  questions: SubjectiveQuestion[];
  usage?: LiveUsage;
}

const PICKER_SYSTEM = `You are an expert teacher who writes original, exam-quality subjective questions.

ABSOLUTE RULES:
- Return ONLY raw JSON. Nothing else. First character MUST be { and last MUST be }.
- No markdown fences, no commentary, no explanation.
- Do NOT select, copy, or reference an external question bank. Write every question yourself.
- Generate EXACTLY the requested counts per difficulty and per category.
- Prefer academically important, exam-worthy questions over trivia. Write the questions a teacher would actually include in a serious paper.
- Mix concepts where marks allow: include questions that connect topics or require multi-step reasoning, not only isolated recall.
- Keep every question self-contained, precise, unambiguous and clearly inside the supplied subject/chapter/topic scope.
- Vary wording and structure; avoid duplicates and near-duplicates.
- For numerical questions, ensure the answer is unambiguous and calculable from the wording.
- Always include "questionHtml": the same question rendered as clean semantic HTML. If the question contains tabular data, render it as a real <table> — never leave pipe-separated rows or space-aligned columns as plain text.

OUTPUT SHAPE:
{ "generated": [{ "question": "...", "questionHtml": "<p>...</p>", "difficulty": "easy", "kind": "Theory", "chapterId": 12, "topicId": 34 }] }
Write "difficulty" as one of easy|medium|hard (lowercase) and "kind" as Theory|Numerical.
Every question MUST include the integer "chapterId" and "topicId" from the scope catalogue supplied in the request.`;

export const generateSubjectiveQuestions = async (
  request: GenerateSubjectiveQuestionsRequest
): Promise<GenerateSubjectiveQuestionsResult> => {
  const total = clampInt(Number(request.numberOfQuestions) || 0, 1, 50);

  let easy = request.easyCount ?? -1;
  let medium = request.mediumCount ?? -1;
  let hard = request.hardCount ?? -1;
  if (easy < 0 && medium < 0 && hard < 0) {
    easy = Math.round(total * 0.4);
    medium = Math.round(total * 0.3);
    hard = total - easy - medium;
  } else {
    easy = Math.max(0, easy < 0 ? 0 : easy);
    medium = Math.max(0, medium < 0 ? 0 : medium);
    hard = Math.max(0, hard < 0 ? 0 : hard);
    if (easy + medium + hard !== total) {
      throw new Error(
        `easyCount+mediumCount+hardCount (${easy + medium + hard}) must equal numberOfQuestions (${total}).`
      );
    }
  }

  const kind = (request.kind ?? "any").toLocaleLowerCase();
  if (!["any", "theory", "numerical"].includes(kind)) {
    throw new Error(`kind must be one of: any, theory, numerical.`);
  }
  const reasoningEffort = request.reasoningEffort ?? "plus";
  if (!["plus", "pro", "max"].includes(reasoningEffort)) {
    throw new Error("Select a valid reasoning effort.");
  }
  let theory = request.theoryCount;
  let numerical = request.numericalCount;
  if (theory == null && numerical == null) {
    theory = kind === "numerical" ? 0 : kind === "theory" ? total : Math.round(total * 0.6);
    numerical = total - theory;
  } else {
    theory = Math.max(0, Math.floor(Number(theory) || 0));
    numerical = Math.max(0, Math.floor(Number(numerical) || 0));
    if (theory + numerical !== total) {
      throw new Error(`theoryCount+numericalCount (${theory + numerical}) must equal numberOfQuestions (${total}).`);
    }
  }

  const subjectId = Number(request.subjectId);
  const chapterIds = [...new Set((request.chapterIds?.length
    ? request.chapterIds
    : request.chapterId == null ? [] : [request.chapterId]).map(Number))];
  const topicIds = [...new Set((request.topicIds?.length
    ? request.topicIds
    : request.topicId == null ? [] : [request.topicId]).map(Number))];
  if (!Number.isInteger(subjectId) || subjectId <= 0) throw new Error("Select a subject.");
  if (chapterIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Select valid chapters.");
  if (topicIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Select valid topics.");
  if (topicIds.length > 0 && chapterIds.length === 0) throw new Error("Select at least one chapter before selecting topics.");

  const scopeCatalog = await loadQuestionScope({
    subjectId,
    chapterIds,
    topicIds,
  });
  const scopeFallback: QuestionScopeFallback = {
    chapterId: chapterIds.length === 1 ? chapterIds[0] : null,
    topicId: topicIds.length === 1 ? topicIds[0] : null,
  };

  const CELLS = ["easy:theory", "easy:numerical", "medium:theory", "medium:numerical", "hard:theory", "hard:numerical"] as const;
  let cellPlan: Record<string, number> | null = null;
  outer: for (let easyTheory = 0; easyTheory <= easy; easyTheory++) {
    const easyNumerical = easy - easyTheory;
    for (let mediumTheory = 0; mediumTheory <= medium; mediumTheory++) {
      const mediumNumerical = medium - mediumTheory;
      const hardTheory = theory - easyTheory - mediumTheory;
      const hardNumerical = hard - hardTheory;
      if (hardTheory < 0 || hardNumerical < 0) continue;
      cellPlan = {
        "easy:theory": easyTheory, "easy:numerical": easyNumerical,
        "medium:theory": mediumTheory, "medium:numerical": mediumNumerical,
        "hard:theory": hardTheory, "hard:numerical": hardNumerical,
      };
      break outer;
    }
  }
  if (!cellPlan) {
    throw new Error("The requested difficulty and category counts cannot be combined. Adjust the counts.");
  }

  const syllabus = (request.syllabus ?? "").trim().slice(0, 4000);
  const scopeLines = formatQuestionScope(scopeCatalog);
  const scopeRules = questionScopeTaggingRules(scopeCatalog);
  const composeLines = CELLS.filter((cell) => cellPlan[cell] > 0).map((cell) => {
    const [d, c] = cell.split(":");
    const kindLabel = c === "theory" ? "Theory" : "Numerical";
    return `- ${d} / ${kindLabel}: ${cellPlan[cell]}`;
  });
  const prompt = `${PICKER_SYSTEM}

Generate EXACTLY ${total} original questions.
Difficulty mix: Easy=${easy}, Medium=${medium}, Hard=${hard}.
Category mix: Theory=${theory}, Numerical=${numerical}.
Exact per-cell counts:
${composeLines.join("\n")}
Reasoning effort: ${reasoningEffort}.

SCOPE:
${scopeLines}
${scopeRules ? `\n${scopeRules}\n` : ""}
${syllabus ? `SYLLABUS / TOPIC GUIDANCE:\n${syllabus}\n` : ""}`;

  let aiComposed: ComposedQuestion[] = [];
  let usage: LiveUsage | undefined;
  try {
    const { content, usage: u } = await chatWithAI(prompt);
    usage = u;
    const cleaned = content.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON in AI reply");
    const parsed = z.object({
      generated: z.array(GeneratedItemSchema).max(50),
    }).safeParse(
      JSON.parse(cleaned.slice(start, end + 1))
    );
    if (!parsed.success) throw new Error("AI generation failed validation");
    aiComposed = normalizeComposed(parsed.data.generated, undefined, {
      catalog: scopeCatalog,
      fallback: scopeFallback,
    });
  } catch (err) {
    console.warn("[question-picker] AI generation failed:", err);
    throw new Error(
      "We couldn't generate the requested question mix for this scope. Broaden the filters or reduce the total, then try again."
    );
  }

  const composedByCell = new Map<string, ComposedQuestion[]>();
  for (const g of aiComposed) {
    const key = `${g.difficulty}:${g.kind.toLowerCase()}`;
    if (!composedByCell.has(key)) composedByCell.set(key, []);
    composedByCell.get(key)!.push(g);
  }
  const generated: SubjectiveQuestion[] = [];
  for (const cell of CELLS) {
    const need = cellPlan[cell];
    if (need === 0) continue;
    const pool = composedByCell.get(cell) ?? [];
    if (pool.length < need) {
      throw new Error(
        "We couldn't generate the requested question mix for this scope. Broaden the filters or reduce the total, then try again."
      );
    }
    for (let i = 0; i < need; i++) {
      const g = pool[i];
      generated.push({
        num: 0,
        question: g.question,
        questionHtml: g.questionHtml ?? null,
        difficulty: g.difficulty,
        kind: g.kind,
        subjectId,
        chapterId: g.chapterId,
        topicId: g.topicId,
      });
    }
  }

  const questions = [...generated];
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = questions[i];
    questions[i] = questions[j];
    questions[j] = tmp;
  }
  const numbered = questions.map((question, index) => ({ ...question, num: index + 1 }));

  return { questions: numbered, usage };
};

export async function getQuestionGeneratorCatalog() {
  const [subjects, chapters, topics, difficulties, categories] = await Promise.all([
    db.query(
      `SELECT DISTINCT s.id, s.subject_name AS name
       FROM subjects s
       WHERE EXISTS (SELECT 1 FROM subject_chapters sc WHERE sc.subject_id = s.id)
         AND EXISTS (
           SELECT 1 FROM chapter_topics ct
           JOIN subject_chapters sc ON sc.id = ct.chapter_id
           WHERE sc.subject_id = s.id
         )
       ORDER BY name`
    ).then((r) => r.rows),
    db.query(
      `SELECT DISTINCT sc.id, sc.subject_id AS "subjectId", sc.chapter_name AS name
       FROM subject_chapters sc
       WHERE EXISTS (SELECT 1 FROM chapter_topics ct WHERE ct.chapter_id = sc.id)
       ORDER BY name`
    ).then((r) => r.rows),
    db.query(
      `SELECT DISTINCT ct.id, ct.chapter_id AS "chapterId", ct.topic_name AS name
       FROM chapter_topics ct
       ORDER BY name`
    ).then((r) => r.rows),
    db.query(`SELECT id, name FROM question_difficulty ORDER BY id`).then((r) => r.rows),
    db.query(`SELECT id, name FROM question_category ORDER BY id`).then((r) => r.rows),
  ]);
  return { subjects, chapters, topics, difficulties, categories };
}

/* ================================================================== */
/*  AI selection schema                                                 */
/* ================================================================== */

const AttemptRuleInput = z.preprocess(
  (raw) => {
    if (typeof raw === "string") {
      const t = raw.toUpperCase().trim();
      if (t === "ANY_N" || t.startsWith("ANY")) return { type: "ANY_N", count: null };
      return { type: "ALL", count: null };
    }
    if (!raw || typeof raw !== "object") return { type: "ALL", count: null };
    const obj = raw as Record<string, unknown>;
    let type = String(obj.type ?? "ALL").toUpperCase().trim();
    const anyMatch = type.match(/^ANY_(\d+)$/);
    let count = obj.count != null ? Number(obj.count) : null;
    if (anyMatch) {
      type = "ANY_N";
      count = count ?? parseInt(anyMatch[1], 10);
    }
    if (type === "ALL") count = null;
    return { type, count };
  },
  z.object({
    type: z.enum(["ALL", "ANY_N", "COMPULSORY_PLUS_OPTIONAL"]),
    count: z.number().int().nonnegative().nullable().optional().default(null),
  })
);

const GeneratedItemSchema = z.object({
  question: z.string().trim().min(10).max(2000),
  questionHtml: z.string().max(20_000).nullish(),
  difficulty: z.string(),
  kind: z.string(),
  chapterId: z.union([z.number(), z.string()]).nullish(),
  topicId: z.union([z.number(), z.string()]).nullish(),
  chapter: z.string().max(300).nullish(),
  topic: z.string().max(300).nullish(),
});

export interface ComposedQuestion {
  question: string;
  questionHtml?: string | null;
  difficulty: "easy" | "medium" | "hard";
  kind: "Theory" | "Numerical";
  chapterId: number | null;
  topicId: number | null;
}

const normDifficulty = (v: string): "easy" | "medium" | "hard" | null => {
  const t = v.trim().toLowerCase();
  return t === "easy" || t === "medium" || t === "hard" ? t : null;
};

const normKind = (v: string): "Theory" | "Numerical" | null => {
  const t = v.trim().toLowerCase();
  return t === "theory" ? "Theory" : t === "numerical" ? "Numerical" : null;
};

const normalizeComposed = (
  items: Array<{
    question: string;
    questionHtml?: string | null;
    difficulty: string;
    kind: string;
    chapterId?: number | string | null;
    topicId?: number | string | null;
    chapter?: string | null;
    topic?: string | null;
  }>,
  fallback?: { difficulty: "easy" | "medium" | "hard"; kind: "Theory" | "Numerical" },
  scope?: { catalog: QuestionScopeCatalog; fallback?: QuestionScopeFallback }
): ComposedQuestion[] =>
  items
    .map((g): ComposedQuestion | null => {
      const difficulty = normDifficulty(g.difficulty) ?? fallback?.difficulty;
      const kind = normKind(g.kind) ?? fallback?.kind;
      if (!difficulty || !kind) return null;
      let questionHtml: string | null = null;
      if (g.questionHtml?.trim()) {
        try {
          questionHtml = sanitizeQuestionHtml(g.questionHtml).html || null;
        } catch {
          questionHtml = null;
        }
      }
      const scopeIds = scope
        ? resolveQuestionScopeIds(g, scope.catalog, scope.fallback)
        : { chapterId: null, topicId: null };
      return { question: g.question, questionHtml, difficulty, kind, ...scopeIds };
    })
    .filter((g): g is ComposedQuestion => g !== null);

const AIPaperBatchSchema = z.object({
  questions: z.array(GeneratedItemSchema).min(1).max(20),
});

const PAPER_MAX_OUTPUT_TOKENS = (() => {
  const configured = Number(process.env.PAPER_MAX_OUTPUT_TOKENS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100_000;
})();
const PAPER_BATCH_SIZE = 8;

/* ================================================================== */
/*  Prompt                                                              */
/* ================================================================== */

const PAPER_SETTER_SYSTEM = `You are an expert university paper setter. Your task is to GENERATE original, exam-quality questions that exactly follow the given section structure.

ABSOLUTE RULES:
- Return ONLY raw JSON. Nothing else. First character MUST be { and last MUST be }.
- No markdown fences, no commentary, no explanation.
- Do NOT select, copy, or reference an external question bank. Write every question yourself.
- The supplied section/group specification is authoritative. Preserve its exact question count, marks-per-question and attempt rule.
- Generate EXACTLY the requested count of questions for the current group, with the requested kind and target difficulty.
- Design one coherent assessment, not isolated questions. Consider coverage, progression, cognitive variety and the relationship between questions across the whole paper.
- Prefer academically important, exam-worthy questions over trivia or obscure edge cases. A strong paper samples the concepts a student must actually know.
- Match the selected overall difficulty exactly. For an easy paper, keep every question direct and single-concept. For a balanced paper, use moderate concept-linking but keep the paper approachable. Only a challenging paper should deliberately combine multiple concepts and demand multi-step reasoning.
- Ensure distinct topics are covered; do not overuse one chapter or repeat the same concept with different wording.
- Avoid duplicates and near-duplicates.
- Treat OVERALL DIFFICULTY as the dominant profile for the paper. Easy papers must not contain hard questions; balanced papers should stay mostly easy/medium with hard reasoning only where unavoidable; challenging papers may use the full medium/hard range. Adapt when the paper is small.
- Match depth to marks and time. Low-mark questions should be concise and focused; medium-mark questions should require explanation or moderate reasoning; high-mark questions need a fuller answer. For an easy paper, high marks mean a longer but still straightforward answer, not a harder multi-concept problem. For a challenging paper, high marks should demand deeper, multi-step work. Never give high marks to trivial recall.
- Use the PAPER BUDGET duration to keep the paper realistic. A long paper should feel substantial through fuller answers or the blueprint's question count, but keep an easy paper straightforward even when it is long. Reserve extended derivations, comparisons and multi-concept reasoning for balanced/challenging papers. A short paper should stay crisp and avoid questions that cannot be answered in the available time.
- Groups of type NUMERICAL must use Numerical questions with unambiguous numeric answers. Other groups use Theory questions unless the group type suggests calculations.
- Respect the supplied subject, chapter, topic and syllabus scope. Every question must clearly belong to it.
- Follow teacher instructions unless they conflict with the blueprint, scope, academic correctness or these system rules.
- Each question must be self-contained, precise and unambiguous.
- Always include "questionHtml": the same question rendered as clean semantic HTML. Use only <p>, <ul>, <ol>, <li>, <strong>, <em>, <pre>, <code>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>, <br> with no classes, styles or inline attributes. Render tabular data as a real HTML table, never pipe-separated text.
- Write "difficulty" as one of easy|medium|hard (lowercase) and "kind" as Theory|Numerical.
- Before responding, silently validate exact counts, structure, marks, uniqueness, syllabus coverage, difficulty profile, time budget, question depth and terminology.

OUTPUT SHAPE:
{ "questions": [{ "question": "...", "questionHtml": "<p>...</p>", "difficulty": "medium", "kind": "Theory", "chapterId": 12, "topicId": 34 }] }
Every question MUST include the integer "chapterId" and "topicId" from the scope catalogue in the request.
Return exactly the number of questions requested for the current group and nothing else.`;

interface PaperBatchArgs {
  title: string;
  instructions: string;
  durationMinutes: number | null;
  budgetMarks: number;
  totalNeeded: number;
  scopeLines: string[];
  scopeCatalog: QuestionScopeCatalog;
  scopeFallback: QuestionScopeFallback;
  outline: string;
  overall: OverallDifficulty | null;
  syllabus: string;
  legacyDifficulty: "any" | "easy" | "medium" | "hard";
  legacyKind: string;
  section: PaperSectionInput;
  sectionIndex: number;
  group: PaperGroupInput;
  groupIndex: number;
  need: number;
  batchIndex: number;
  batchCount: number;
  already: ComposedQuestion[];
}

const generatePaperBatch = async (
  args: PaperBatchArgs
): Promise<{ questions: ComposedQuestion[]; usage?: LiveUsage }> => {
  const {
    title, instructions, durationMinutes, budgetMarks, totalNeeded, scopeLines,
    scopeCatalog, scopeFallback, outline, overall, syllabus, legacyDifficulty,
    legacyKind, section, sectionIndex, group, groupIndex, need, batchIndex,
    batchCount, already,
  } = args;
  const mpq = Math.max(0.5, Number(group.marksPerQuestion) || 1);
  const wantKind = groupKind(String(group.type), legacyKind);
  const wantDiff = targetDifficulty(mpq, overall, legacyDifficulty);
  const timeBudget = durationMinutes
    ? `${durationMinutes} minutes for ${Math.round(budgetMarks)} marks (${(durationMinutes / Math.max(budgetMarks, 1)).toFixed(1)} minutes per mark)`
    : "No duration supplied — use the blueprint marks and question depth as the time budget.";
  const avoid = already
    .slice(-20)
    .map((q) => `- ${q.question.slice(0, 180)}`)
    .join("\n");
  const batchNote = batchCount > 1
    ? `This is batch ${batchIndex + 1} of ${batchCount} for this group. Write these questions as part of the same coherent paper; do not repeat questions from earlier batches.`
    : "";
  const prompt = `${PAPER_SETTER_SYSTEM}

PAPER TITLE: ${title}
${instructions ? `TEACHER INSTRUCTIONS:\n${instructions}\n` : "No additional teacher instructions supplied."}
PAPER BUDGET:
- Questions in paper: ${totalNeeded}
- Marks in paper: ${Math.round(budgetMarks)}
- Duration: ${timeBudget}
- Select questions a student can realistically attempt in this time. For a long duration, choose substantial questions that reward deeper thinking; for a short duration, choose focused questions that can be answered quickly. High-mark questions must demand correspondingly longer, harder answers.

SCOPE:
${scopeLines.join("\n")}
${questionScopeTaggingRules(scopeCatalog)}
${overall !== null ? `OVERALL DIFFICULTY (${overall}): ${OVERALL_DIFFICULTY_GUIDANCE[overall]}\n` : ""}${syllabus ? `CREATOR SYLLABUS / CONTEXT:\n${syllabus}\n` : ""}

PAPER OUTLINE (for coherence; generate only the current group):
${outline}

CURRENT SECTION ${sectionIndex + 1}: ${section.label ? `Section ${section.label} — ` : ""}${section.name}${section.title ? ` — ${section.title}` : ""}
CURRENT GROUP ${groupIndex + 1}: name="${group.name || group.type}", type=${group.type}, ${mpq} mark(s) per question, kind=${wantKind}, target difficulty=${wantDiff}
TASK: Generate EXACTLY ${need} question(s) for this group. ${batchNote}
${avoid ? `DO NOT REPEAT OR NEAR-DUPLICATE THESE ALREADY GENERATED QUESTIONS:\n${avoid}\n` : ""}`;

  let tokenLimit = PAPER_MAX_OUTPUT_TOKENS;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const retryNote = attempt > 1
        ? `\nRETRY ${attempt}: the previous response was incomplete or invalid. Return compact, complete JSON with exactly ${need} question(s).`
        : "";
      const { content, usage } = await chatWithAI(
        prompt + retryNote,
        undefined,
        { maxTokens: tokenLimit, temperature: attempt === 1 ? 0.6 : 0.2 }
      );
      const cleaned = content.replace(/```(?:json)?/gi, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end <= start) throw new Error("No JSON in AI reply");
      let parsed: z.infer<typeof AIPaperBatchSchema>;
      try {
        parsed = AIPaperBatchSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
      } catch (parseErr) {
        throw new Error(`Invalid JSON from AI: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      }
      const normalized = normalizeComposed(
        parsed.questions,
        { difficulty: wantDiff, kind: wantKind },
        { catalog: scopeCatalog, fallback: scopeFallback }
      );
      if (normalized.length < need) {
        throw new Error(`AI returned ${normalized.length} valid question(s), but ${need} were required`);
      }
      return { questions: normalized.slice(0, need), usage };
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[question-paper] batch ${sectionIndex + 1}.${groupIndex + 1}.${batchIndex + 1} attempt ${attempt} failed:`,
        message
      );
      if (tokenLimit > 8192 && /max[_ ]?tokens|maxoutputtokens|max_completion_tokens|maximum.*token|too large|context length/i.test(message)) {
        tokenLimit = 8192;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("AI question generation failed");
};

/* ================================================================== */
/*  Main                                                                */
/* ================================================================== */

const normalizeAttempt = (raw: unknown): { type: string; count: number | null } => {
  const parsed = AttemptRuleInput.safeParse(raw);
  if (!parsed.success) return { type: "ALL", count: null };
  return { type: parsed.data.type, count: parsed.data.count ?? null };
};

const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(n)));

export const generateQuestionPaper = async (
  request: GeneratePaperRequest
): Promise<GeneratePaperResult> => {
  const sections = request.sections ?? [];
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("At least one section with question groups is required.");
  }

  const groupNeed = (g: PaperSectionInput["questionGroups"][number]) =>
    clampInt(Number(g.questionCount) || 0, 1, 50);
  const totalNeeded = sections.reduce(
    (sum, s) => sum + (s.questionGroups ?? []).reduce((g, x) => g + groupNeed(x), 0),
    0
  );
  if (totalNeeded <= 0) throw new Error("Sections must require at least one question.");
  if (totalNeeded > 100) throw new Error("A paper can have at most 100 questions.");

  const subjectId = Number(request.subjectId);
  const chapterIds = [...new Set((request.chapterIds?.length
    ? request.chapterIds
    : request.chapterId == null ? [] : [request.chapterId]).map(Number))];
  const topicIds = [...new Set((request.topicIds?.length
    ? request.topicIds
    : request.topicId == null ? [] : [request.topicId]).map(Number))];
  const overall = request.overallDifficulty ?? null;
  const difficulty = String(request.difficulty ?? "any").toLowerCase();
  const kind = String(request.kind ?? "any").toLowerCase();
  if (!Number.isInteger(subjectId) || subjectId <= 0) throw new Error("Select a subject.");
  if (chapterIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Select valid chapters.");
  if (topicIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Select valid topics.");
  if (overall !== null && !["easy", "balanced", "challenging"].includes(overall)) {
    throw new Error("Select a valid overall difficulty.");
  }
  if (!["any", "easy", "medium", "hard"].includes(difficulty)) throw new Error("Select a valid difficulty.");
  if (!["any", "theory", "numerical"].includes(kind)) throw new Error("Select a valid category.");
  const legacyDifficulty = difficulty as "any" | "easy" | "medium" | "hard";

  const scopeCatalog = await loadQuestionScope({
    subjectId,
    chapterIds,
    topicIds,
  });
  const scopeFallback: QuestionScopeFallback = {
    chapterId: chapterIds.length === 1 ? chapterIds[0] : null,
    topicId: topicIds.length === 1 ? topicIds[0] : null,
  };

  const syllabus = (request.syllabus ?? "").trim().slice(0, 4000);
  const title = (request.title ?? "").trim().slice(0, 200) || "Question Paper";
  const instructions = (request.instructions ?? "").trim().slice(0, 2000);
  const durationMinutes = request.durationMinutes != null
    ? clampInt(request.durationMinutes, 10, 600)
    : null;
  const budgetMarks = sections.reduce(
    (sum, s) =>
      sum +
      (s.questionGroups ?? []).reduce(
        (groupSum, g) =>
          groupSum + groupNeed(g) * Math.max(0.5, Number(g.marksPerQuestion) || 1),
        0
      ),
    0
  );

  const scopeLines = formatQuestionScope(scopeCatalog).split("\n");

  let usage: LiveUsage | undefined;
  const addUsage = (next?: LiveUsage) => {
    if (!next) return;
    usage = usage ?? {};
    if (next.inputTokens != null) usage.inputTokens = (usage.inputTokens ?? 0) + next.inputTokens;
    if (next.outputTokens != null) usage.outputTokens = (usage.outputTokens ?? 0) + next.outputTokens;
    if (next.totalTokens != null) usage.totalTokens = (usage.totalTokens ?? 0) + next.totalTokens;
    if (next.reasoningTokens != null) usage.reasoningTokens = (usage.reasoningTokens ?? 0) + next.reasoningTokens;
  };

  const paperOutline = sections
    .map((sec, index) => {
      const groups = (sec.questionGroups ?? [])
        .map((g) => `${g.name || g.type}: ${groupNeed(g)} × ${g.marksPerQuestion} marks, type ${g.type}`)
        .join("; ");
      return `- Section ${sec.label ?? index + 1}: ${sec.name} → ${groups}`;
    })
    .join("\n");

  const paperGroups: ComposedQuestion[][][] = [];
  const avoidPool: ComposedQuestion[] = [];
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const sectionGroups: ComposedQuestion[][] = [];
    for (let gi = 0; gi < (section.questionGroups ?? []).length; gi++) {
      const group = section.questionGroups[gi];
      const need = groupNeed(group);
      const collected: ComposedQuestion[] = [];
      const batchCount = Math.ceil(need / PAPER_BATCH_SIZE);
      for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
        const start = batchIndex * PAPER_BATCH_SIZE;
        const count = Math.min(PAPER_BATCH_SIZE, need - start);
        try {
          const result = await generatePaperBatch({
            title,
            instructions,
            durationMinutes,
            budgetMarks,
            totalNeeded,
            scopeLines,
            scopeCatalog,
            scopeFallback,
            outline: paperOutline,
            overall,
            syllabus,
            legacyDifficulty,
            legacyKind: kind,
            section,
            sectionIndex: si,
            group,
            groupIndex: gi,
            need: count,
            batchIndex,
            batchCount,
            already: avoidPool.slice(-20),
          });
          collected.push(...result.questions);
          avoidPool.push(...result.questions);
          addUsage(result.usage);
        } catch (err) {
          console.warn("[question-paper] AI generation failed:", err);
          throw new Error(
            "We couldn't generate the question paper for this scope. Please try again or adjust the blueprint."
          );
        }
      }
      sectionGroups.push(collected);
    }
    paperGroups.push(sectionGroups);
  }

  const paperSections: PaperSection[] = sections.map((s, si) => {
    const groups: PaperGroup[] = (s.questionGroups ?? []).map((g, gi) => {
      const need = groupNeed(g);
      const mpq = Math.max(0.5, Number(g.marksPerQuestion) || 1);
      const rule = normalizeAttempt(g.attemptRule);
      if (rule.type === "ANY_N" && (rule.count == null || rule.count <= 0)) {
        rule.count = Math.max(1, need - 1);
      }

      const normalized = paperGroups[si]?.[gi] ?? [];
      if (normalized.length < need) {
        throw new Error(
          `The AI returned ${normalized.length} question(s) for ${s.name} / ${g.name || g.type}, but ${need} were required. Please try again.`
        );
      }
      const questions: PaperQuestion[] = normalized.slice(0, need).map((c, index) => ({
        num: index + 1,
        question: c.question,
        questionHtml: c.questionHtml ?? null,
        difficulty: c.difficulty,
        kind: c.kind,
        marks: mpq,
        subjectId,
        chapterId: c.chapterId,
        topicId: c.topicId,
      }));

      return {
        name: (g.name || String(g.type)).trim(),
        type: String(g.type).toUpperCase().trim() || "OTHER",
        marksPerQuestion: mpq,
        attemptRule: rule,
        questions,
      };
    });

    let totalQuestions = 0;
    let totalAvailableMarks = 0;
    let sectionMarks = 0;
    for (const g of groups) {
      totalQuestions += g.questions.length;
      const available = g.questions.reduce((sum, q) => sum + q.marks, 0);
      totalAvailableMarks += available;
      if (g.attemptRule.type === "ALL" || !g.attemptRule.count) sectionMarks += available;
      else {
        const attemptCount = Math.min(g.attemptRule.count, g.questions.length);
        sectionMarks += attemptCount * g.marksPerQuestion;
      }
    }

    return {
      order: s.order ?? si + 1,
      label: (s.label ?? String.fromCharCode(65 + si)).trim(),
      name: s.name,
      title: (s.title ?? "").trim(),
      instructions: (s.instructions ?? "").trim(),
      questionGroups: groups,
      totalQuestions,
      totalAvailableMarks,
      sectionMarks,
    };
  });

  const paper: QuestionPaper = {
    title,
    instructions,
    syllabus,
    sections: paperSections,
    totalQuestions: paperSections.reduce((sum, x) => sum + x.totalQuestions, 0),
    totalMarks: paperSections.reduce((sum, x) => sum + x.sectionMarks, 0),
    durationMinutes: durationMinutes ?? undefined,
  };

  return { paper, usage };
};

/* ================================================================== */
/*  Printable HTML rendering                                            */
/* ================================================================== */

const escapeHtml = (v: string): string =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Render generated HTML safely; fall back to escaped plain text if malformed. */
const renderQuestionBody = (q: PaperQuestion): string => {
  const html = q.questionHtml?.trim();
  if (!html) return escapeHtml(q.question);
  try {
    const safe = sanitizeQuestionHtml(html).html;
    return safe || escapeHtml(q.question);
  } catch {
    return escapeHtml(q.question);
  }
};

const attemptNote = (g: PaperGroup): string => {
  if (g.attemptRule.type === "ANY_N" && g.attemptRule.count) {
    return `Attempt any ${g.attemptRule.count} out of ${g.questions.length} questions.`;
  }
  return "Answer all questions.";
};

export const renderPaperHtml = (paper: QuestionPaper): string => {
  let qNo = 0;
  const sectionsHtml = paper.sections
    .map((s) => {
      const groupsHtml = s.questionGroups
        .map((g) => {
          const items = g.questions
            .map((q) => {
              qNo++;
              return `<div class="q"><div class="q-row"><span class="q-no">Q${qNo}.</span><div class="q-text">${renderQuestionBody(q)}</div><span class="q-marks">[${q.marks} mark${q.marks !== 1 ? "s" : ""}]</span></div></div>`;
            })
            .join("\n");
          return `<div class="group"><div class="group-head"><span>${escapeHtml(g.name)} (${g.questions.length} × ${g.marksPerQuestion} marks)</span></div><div class="attempt">${escapeHtml(attemptNote(g))}</div>${items}</div>`;
        })
        .join("\n");
      return `<div class="section"><div class="section-head"><span>Section ${escapeHtml(s.label)} — ${escapeHtml(s.name)}</span><span class="sec-marks">${s.sectionMarks} marks</span></div>${s.title ? `<div class="section-title">${escapeHtml(s.title)}</div>` : ""}${s.instructions ? `<div class="instructions">Instructions: ${escapeHtml(s.instructions)}</div>` : ""}${groupsHtml}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(paper.title)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", "Noto Serif", serif; color: #111; max-width: 760px; margin: 0 auto; padding: 40px 32px; line-height: 1.6; }
  .paper-head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 28px; }
  .paper-head h1 { font-size: 26px; margin: 0 0 8px; letter-spacing: 0.01em; }
  .paper-meta { font-size: 13.5px; color: #333; }
  .gen-instructions { font-size: 14px; margin: 12px 0 0; font-style: italic; }
  .section { margin-bottom: 30px; page-break-inside: avoid; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 18px; font-weight: bold; border-bottom: 1px solid #111; padding: 0 2px 6px; }
  .sec-marks { font-size: 14px; white-space: nowrap; }
  .section-title { font-size: 14.5px; font-weight: bold; margin: 8px 0 0 2px; }
  .instructions { font-size: 13.5px; font-style: italic; margin: 6px 0 0 2px; color: #333; }
  .group { margin: 16px 0 0 2px; }
  .group-head { font-size: 14.5px; font-weight: bold; }
  .attempt { font-size: 12.5px; font-style: italic; color: #444; margin: 2px 0 10px; }
  .q { margin: 12px 0; text-align: justify; }
  .q-row { display: flex; gap: 10px; font-size: 15px; line-height: 1.7; }
  .q-no { font-weight: bold; white-space: nowrap; }
  .q-text { flex: 1; }
  .q-text p { margin: 0 0 6px; }
  .q-text p:last-child { margin-bottom: 0; }
  .q-text ul, .q-text ol { margin: 4px 0 6px; padding-left: 20px; }
  .q-text li { margin: 2px 0; }
  .q-text table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 13.5px; }
  .q-text th, .q-text td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
  .q-text th { background: #f2f2f2; font-weight: bold; }
  .q-text pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f5f5f5; border: 1px solid #999; padding: 6px 8px; font-size: 13px; }
  .q-text code { font-family: "Courier New", monospace; font-size: 13px; }
  .q-marks { white-space: nowrap; font-weight: bold; }
  .paper-foot { margin-top: 36px; border-top: 2px solid #111; padding-top: 12px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
  .paper-brand { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; font-size: 11px; color: #777; letter-spacing: 0.02em; }
  .paper-brand .brand-mark { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; background: #EC4899; color: #fff; font-size: 10px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="paper-head">
    <h1>${escapeHtml(paper.title)}</h1>
    <div class="paper-meta">Total Questions: ${paper.totalQuestions} &nbsp;·&nbsp; Total Marks: ${paper.totalMarks}${paper.durationMinutes ? ` &nbsp;·&nbsp; Duration: ${paper.durationMinutes} minutes` : ""}</div>
    ${paper.instructions ? `<div class="gen-instructions">${escapeHtml(paper.instructions)}</div>` : ""}
  </div>
  ${sectionsHtml}
  <div class="paper-foot"><span>Total Questions: ${paper.totalQuestions}</span><span>Total Marks: ${paper.totalMarks}</span></div>
  <div class="paper-brand"><span class="brand-mark">Q</span><span>QuizSupport</span></div>
</body>
</html>`;
};

/* ================================================================== */
/*  Word (.docx) rendering                                              */
/* ================================================================== */

const docxText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

const docxMeta = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "0";
};

/* Same heuristic as the platform question bank: a space-aligned <pre> block
   with a consistent column count is really a table. */
const preTextToRows = (text: string): { header: boolean; cells: string[] }[] | null => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return null;
  const rows = lines.map((line) => line.split(/\s{2,}|\t+/).map((cell) => cell.trim()).filter(Boolean));
  const cols = rows[0].length;
  if (cols < 2) return null;
  if (!rows.every((row) => row.length === cols)) return null;
  if (lines.some((line) => line.length > 80)) return null;
  return rows.map((cells, index) => ({ header: index === 0, cells }));
};

type DocxQuestionBlock =
  | { kind: "text"; text: string; mono?: boolean }
  | { kind: "table"; rows: { header: boolean; cells: string[] }[] };

/* Questions store sanitized HTML (tables, <pre> blocks, lists…); turn it
   into ordered docx blocks so tables render as real Word tables. */
const htmlToDocxBlocks = (html: string): DocxQuestionBlock[] => {
  const $ = cheerio.load(`<div id="paper-q">${html}</div>`, null, false);
  const root = $("#paper-q");
  const replacements = new Map<string, DocxQuestionBlock>();
  let marker = 0;

  root.find("table").each((_index, element) => {
    const key = `\u0001${marker++}\u0001`;
    const rows: { header: boolean; cells: string[] }[] = [];
    $(element)
      .find("tr")
      .each((_row, tr) => {
        const $tr = $(tr);
        const cells = $tr
          .find("th, td")
          .map((_cell, cell) => $(cell).text().replace(/\s+/g, " ").trim())
          .get();
        if (cells.length) rows.push({ header: $tr.find("th").length > 0, cells });
      });
    if (rows.length) replacements.set(key, { kind: "table", rows });
    $(element).replaceWith(rows.length ? key : "");
  });

  root.find("pre").each((_index, element) => {
    const key = `\u0001${marker++}\u0001`;
    const text = $(element).text();
    const rows = preTextToRows(text);
    replacements.set(key, rows ? { kind: "table", rows } : { kind: "text", text, mono: true });
    $(element).replaceWith(key);
  });

  root.find("br").replaceWith("\n");
  root.find("td, th").each((_index, element) => {
    $(element).append(" ");
  });
  root.find("p, div, blockquote, li, h1, h2, h3, h4").each((_index, element) => {
    $(element).prepend("\n");
    $(element).append("\n");
  });

  const blocks: DocxQuestionBlock[] = [];
  const parts = root.text().split(/\u0001(\d+)\u0001/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      for (const line of parts[i]
        .split("\n")
        .map((l) => l.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)) {
        blocks.push({ kind: "text", text: line });
      }
    } else {
      const block = replacements.get(`\u0001${parts[i]}\u0001`);
      if (block) blocks.push(block);
    }
  }
  return blocks;
};

const docxTable = (rows: { header: boolean; cells: string[] }[]): Table => {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: rows.map(
      (row) =>
        new TableRow({
          tableHeader: row.header,
          children: row.cells.map(
            (cell) =>
              new TableCell({
                shading: row.header ? { fill: "F2F0FA" } : undefined,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cell, size: 22, bold: row.header })],
                  }),
                ],
              })
          ),
        })
    ),
  });
};

/**
 * Build the same question paper as a Word (.docx) file.
 * Mirrors renderPaperHtml section-for-section; returns the file bytes.
 */
export const renderPaperDocx = async (paper: QuestionPaper): Promise<Buffer> => {
  const title = docxText(paper.title) || "Question Paper";
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Total Questions: ${docxMeta(paper.totalQuestions)}   ·   Total Marks: ${docxMeta(paper.totalMarks)}${
            paper.durationMinutes ? `   ·   Duration: ${docxMeta(paper.durationMinutes)} minutes` : ""
          }`,
          size: 20,
          color: "555555",
        }),
      ],
    }),
  ];
  if (docxText(paper.instructions)) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: docxText(paper.instructions), italics: true, size: 22 })],
      })
    );
  }

  let qNo = 0;
  for (const s of paper.sections ?? []) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `Section ${docxText(s.label)} — ${docxText(s.name)} (${docxMeta(s.sectionMarks)} marks)`,
            bold: true,
          }),
        ],
      })
    );
    if (docxText(s.title)) {
      children.push(new Paragraph({ children: [new TextRun({ text: docxText(s.title), bold: true })] }));
    }
    if (docxText(s.instructions)) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Instructions: ${docxText(s.instructions)}`, italics: true })],
        })
      );
    }
    for (const g of s.questionGroups ?? []) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: `${docxText(g.name)} (${(g.questions ?? []).length} × ${docxMeta(g.marksPerQuestion)} marks)`,
              bold: true,
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text:
                g.attemptRule?.type === "ANY_N" && g.attemptRule?.count
                  ? `Attempt any ${docxMeta(g.attemptRule.count)} out of ${(g.questions ?? []).length} questions.`
                  : "Answer all questions.",
              italics: true,
              color: "555555",
            }),
          ],
        })
      );
      for (const q of g.questions ?? []) {
        qNo++;
        let html = typeof q.questionHtml === "string" ? q.questionHtml.trim() : "";
        if (html) {
          try {
            html = sanitizeQuestionHtml(html).html;
          } catch {
            html = "";
          }
        }
        const blocks: DocxQuestionBlock[] = html ? htmlToDocxBlocks(html) : [];
        if (!blocks.length) blocks.push({ kind: "text", text: docxText(q.question) });

        const marksText = `[${docxMeta(q.marks)} mark${Number(q.marks) !== 1 ? "s" : ""}]`;
        let prefixDone = false;
        if (blocks[0].kind === "table") {
          children.push(
            new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Q${qNo}.`, bold: true, size: 24 })] })
          );
          prefixDone = true;
        }
        blocks.forEach((block, index) => {
          if (block.kind === "table") {
            children.push(docxTable(block.rows));
            return;
          }
          const isLast = index === blocks.length - 1;
          const runs: TextRun[] = [];
          if (!prefixDone) {
            runs.push(new TextRun({ text: `Q${qNo}.  `, bold: true, size: 24 }));
            prefixDone = true;
          }
          runs.push(
            new TextRun({
              text: docxText(block.text),
              size: 24,
              ...(block.mono ? { font: "Courier New", size: 20 } : {}),
            })
          );
          if (isLast) runs.push(new TextRun({ text: `  ${marksText}`, bold: true, size: 24 }));
          children.push(new Paragraph({ spacing: { after: 120 }, children: runs }));
        });
        if (blocks[blocks.length - 1].kind === "table") {
          children.push(
            new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: marksText, bold: true, size: 24 })] })
          );
        }
      }
    }
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Total Questions: ${docxMeta(paper.totalQuestions)}        Total Marks: ${docxMeta(paper.totalMarks)}`,
          bold: true,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240 },
      children: [
        new TextRun({ text: "Q", bold: true, color: "EC4899", size: 18 }),
        new TextRun({ text: " QuizSupport", size: 16, color: "777777" }),
      ],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
};
