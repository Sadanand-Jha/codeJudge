/**
 * Question Paper Generation Service — build a full question paper from
 * created sections + the curated subjective bank in `public/`.
 *
 * Pipeline: sections JSON (+ optional syllabus) → subjective bank (.docx)
 * → AI selects bank questions per section/group → server rehydrates +
 * validates → printable paper.
 *
 * The AI only SELECTS bank question numbers — every question's wording,
 * difficulty and kind comes from the parsed Word file, never the model.
 * Totals/marks are computed server-side, mirroring testSectionGeneration.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import mammoth from "mammoth";
import { chatWithAI } from "./ai.service.js";
import type { LiveUsage } from "./ai.service.js";

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

export interface GeneratePaperRequest {
  sections: PaperSectionInput[];
  title?: string;
  instructions?: string;
  /** Free-form syllabus/topics — the AI prefers bank questions matching it. */
  syllabus?: string;
  durationMinutes?: number;
}

export interface PaperQuestion {
  num: number;
  question: string;
  difficulty: string;
  kind: string;
  marks: number;
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
  /** Topic / syllabus — the AI prefers bank questions matching it. */
  syllabus?: string;
  kind?: "any" | "theory" | "numerical";
}

export interface SubjectiveQuestion {
  num: number;
  question: string;
  difficulty: string;
  kind: string;
}

export interface GenerateSubjectiveQuestionsResult {
  questions: SubjectiveQuestion[];
  usage?: LiveUsage;
}

const PICKER_SYSTEM = `You are an expert teacher picking the perfect questions from an Operating Systems subjective question bank.

ABSOLUTE RULES:
- Return ONLY raw JSON. Nothing else. First character MUST be { and last MUST be }.
- No markdown fences, no commentary, no explanation.
- You MUST pick ONLY question numbers that exist in the QUESTION BANK below. Never invent, rephrase, or renumber.
- Every question number may be used AT MOST ONCE.
- Pick EXACTLY the requested counts per difficulty.
- Prefer questions whose wording matches the given topic/syllabus. If the bank has too few matching questions, fill the rest with the closest related ones.

OUTPUT SHAPE:
{ "nums": [12, 45, 3] }`;

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

  const { bank } = await loadSubjectiveBank();
  const pool = kind === "any" ? bank : bank.filter((q) => q.kind.toLocaleLowerCase() === kind);
  if (pool.length < total) {
    throw new Error(`Only ${pool.length} "${kind}" questions are available, but ${total} were requested.`);
  }
  const byNum = new Map(pool.map((q) => [q.num, q]));

  const syllabus = (request.syllabus ?? "").trim().slice(0, 4000);
  const bankForPrompt = pool
    .map((q) => `Q${q.num}. [${q.difficulty}|${q.kind}] ${q.question}`)
    .join("\n");

  const prompt = `${PICKER_SYSTEM}

Pick EXACTLY ${total} questions — Easy=${easy}, Medium=${medium}, Hard=${hard}. Kind filter: ${kind}.
${syllabus ? `TOPIC / SYLLABUS (prefer matching questions):\n${syllabus}\n` : "No topic supplied — pick the strongest questions across the bank."}

QUESTION BANK:
${bankForPrompt}`;

  let aiNums: number[] = [];
  let usage: LiveUsage | undefined;
  try {
    const { content, usage: u } = await chatWithAI(prompt);
    usage = u;
    const cleaned = content.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON in AI reply");
    const parsed = z.object({ nums: z.array(z.number().int().positive()).max(50) }).safeParse(
      JSON.parse(cleaned.slice(start, end + 1))
    );
    if (!parsed.success) throw new Error("AI selection failed validation");
    aiNums = parsed.data.nums.filter((n) => byNum.has(n));
  } catch (err) {
    console.warn("[question-picker] AI selection failed, using deterministic fallback:", err);
    aiNums = [];
  }

  // Rehydrate: keep valid AI picks per difficulty bucket, repair shortfalls.
  const terms = syllabusTerms(syllabus);
  const ranked = [...pool].sort((a, b) => {
    const diff = scoreBySyllabus(b, terms) - scoreBySyllabus(a, terms);
    if (diff !== 0) return diff;
    return a.num - b.num;
  });
  const used = new Set<number>();
  const takeUnused = (difficulty: string, count: number): BankQuestion[] => {
    const out: BankQuestion[] = [];
    for (const q of ranked) {
      if (out.length >= count) break;
      if (!used.has(q.num) && q.difficulty === difficulty) {
        used.add(q.num);
        out.push(q);
      }
    }
    for (const q of ranked) {
      if (out.length >= count) break;
      if (!used.has(q.num)) {
        used.add(q.num);
        out.push(q);
      }
    }
    return out;
  };

  const buckets: Array<{ difficulty: string; need: number }> = [
    { difficulty: "easy", need: easy },
    { difficulty: "medium", need: medium },
    { difficulty: "hard", need: hard },
  ];
  const picked: BankQuestion[] = [];
  for (const b of buckets) {
    const kept: BankQuestion[] = [];
    for (const n of aiNums) {
      if (kept.length >= b.need) break;
      const q = byNum.get(n);
      if (q && !used.has(n) && q.difficulty === b.difficulty) {
        used.add(n);
        kept.push(q);
      }
    }
    if (kept.length < b.need) kept.push(...takeUnused(b.difficulty, b.need - kept.length));
    picked.push(...kept);
  }

  const questions: SubjectiveQuestion[] = picked.map((q) => ({
    num: q.num,
    question: q.question,
    difficulty: q.difficulty,
    kind: q.kind,
  }));

  return { questions, usage };
};

/* ================================================================== */
/*  Subjective bank loading                                             */
/* ================================================================== */

const SUBJECTIVE_FILENAMES = [
  "Operating_Systems_100_Subjective_Problems (1).docx",
  "Operating_Systems_100_Subjective_Problems.docx",
];

async function resolveSubjectiveBankPath(): Promise<string | null> {
  const candidates: string[] = [];
  if (process.env.SUBJECTIVE_BANK_PATH) candidates.push(process.env.SUBJECTIVE_BANK_PATH);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  for (const n of SUBJECTIVE_FILENAMES) {
    candidates.push(path.resolve(process.cwd(), "public", n));
    candidates.push(path.resolve(process.cwd(), "code-judge-backend/public", n));
    candidates.push(path.resolve(__dirname, "../../public", n));
    candidates.push(path.resolve(__dirname, "../../../public", n));
    candidates.push(path.resolve(__dirname, "../../..", "public", n));
    candidates.push(path.resolve(process.cwd(), "../code-judge-frontend/public", n));
  }
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // try next
    }
  }
  return null;
}

interface BankQuestion {
  num: number;
  difficulty: string; // easy | medium | hard
  kind: string; // Theory | Numerical
  question: string;
}

/** Parse `N. [Difficulty | Kind] question text` lines from the .docx. */
function parseSubjectiveBank(bankText: string): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (const rawLine of bankText.split("\n")) {
    const line = rawLine.trim();
    const m = line.match(/^(\d+)\.\s*\[(Easy|Medium|Hard)\s*\|\s*(Theory|Numerical)\]\s*(.+)$/i);
    if (!m) continue;
    out.push({
      num: Number(m[1]),
      difficulty: m[2].toLocaleLowerCase(),
      kind: m[3].toLowerCase() === "numerical" ? "Numerical" : "Theory",
      question: m[4].trim(),
    });
  }
  // De-dupe by question number, keep first occurrence.
  const seen = new Set<number>();
  return out.filter((q) => (seen.has(q.num) ? false : (seen.add(q.num), true)));
}

async function loadSubjectiveBank(): Promise<{ bank: BankQuestion[]; bankText: string }> {
  const bankPath = await resolveSubjectiveBankPath();
  if (!bankPath) {
    throw new Error("Subjective question bank is temporarily unavailable. Please try again later.");
  }
  const buffer = await fs.readFile(bankPath);
  let text = "";
  try {
    text = (await mammoth.extractRawText({ buffer })).value ?? "";
  } catch (e) {
    console.warn("mammoth extraction failed for subjective bank:", e);
  }
  if (!text.trim()) {
    throw new Error("Subjective question bank is temporarily unavailable. Please try again later.");
  }
  const bank = parseSubjectiveBank(text);
  if (bank.length === 0) {
    throw new Error("Subjective question bank could not be parsed safely.");
  }
  return { bank, bankText: text };
}

/* ================================================================== */
/*  Syllabus matching                                                   */
/* ================================================================== */

const SYLLABUS_STOPWORDS = new Set([
  "and", "the", "with", "from", "into", "unit", "chapter", "topic", "topics",
  "module", "modules", "include", "including", "about", "basics", "introduction",
  "overview", "part", "section", "covers", "cover", "based", "using", "their",
  "this", "that", "these", "those", "will", "shall", "should",
]);

const syllabusTerms = (syllabus: string): string[] =>
  syllabus
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !SYLLABUS_STOPWORDS.has(t));

/** Score a bank question against syllabus terms (title-weighted by frequency). */
const scoreBySyllabus = (q: BankQuestion, terms: string[]): number => {
  if (terms.length === 0) return 0;
  const hay = q.question.toLocaleLowerCase();
  let score = 0;
  for (const t of terms) {
    let idx = hay.indexOf(t);
    while (idx !== -1) {
      score++;
      idx = hay.indexOf(t, idx + t.length);
    }
  }
  return score;
};

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

const AISelectionSchema = z.object({
  sections: z
    .array(
      z.object({
        groups: z.array(
          z.object({
            nums: z.array(z.number().int().positive()).max(50),
          })
        ),
      })
    )
    .min(1),
});

/* ================================================================== */
/*  Prompt                                                              */
/* ================================================================== */

const PAPER_SETTER_SYSTEM = `You are an expert university paper setter. Your task is to SELECT questions from the provided Operating Systems subjective question bank to build a complete question paper that exactly follows the given section structure.

ABSOLUTE RULES:
- Return ONLY raw JSON. Nothing else. First character MUST be { and last MUST be }.
- No markdown fences, no commentary, no explanation.
- You MUST select ONLY question numbers that exist in the QUESTION BANK below. Never invent, rephrase, or renumber questions.
- Every question number may be used AT MOST ONCE in the whole paper.
- For each group, select EXACTLY the required count of question numbers.
- Match difficulty to marks: groups with low marks-per-question (1-2) should get Easy questions, mid marks (3-5) Medium, high marks (6+) Hard.
- Groups of type NUMERICAL must use Numerical-kind bank questions. Other groups prefer Theory questions unless the group type suggests calculations.
- If a syllabus is supplied, PREFER bank questions whose wording matches the syllabus topics. If the bank has too few matching questions, fill the rest with the closest related ones — never invent new questions.

OUTPUT SHAPE (arrays aligned by index with the SECTIONS SPEC):
{
  "sections": [
    { "groups": [ { "nums": [3, 17] }, { "nums": [42] } ] }
  ]
}`;

const describeSectionsSpec = (sections: PaperSectionInput[]): string =>
  sections
    .map((s, si) => {
      const groups = s.questionGroups
        .map(
          (g, gi) =>
            `  Group ${gi + 1}: name="${g.name || g.type}", type=${g.type}, need EXACTLY ${g.questionCount} question(s), ${g.marksPerQuestion} mark(s) each`
        )
        .join("\n");
      return `Section ${si + 1} (${s.label || `order ${s.order ?? si + 1}`}): "${s.name}"${s.title ? ` — ${s.title}` : ""}\n${groups}`;
    })
    .join("\n\n");

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
  const totalNeeded = sections.reduce(
    (sum, s) => sum + (s.questionGroups ?? []).reduce((g, x) => g + (Number(x.questionCount) || 0), 0),
    0
  );
  if (totalNeeded <= 0) throw new Error("Sections must require at least one question.");
  if (totalNeeded > 100) throw new Error("A paper can have at most 100 questions.");

  const { bank } = await loadSubjectiveBank();
  if (totalNeeded > bank.length) {
    throw new Error(`Only ${bank.length} bank questions are available, but ${totalNeeded} were requested.`);
  }
  const byNum = new Map(bank.map((q) => [q.num, q]));

  const syllabus = (request.syllabus ?? "").trim().slice(0, 4000);
  const title = (request.title ?? "").trim().slice(0, 200) || "Question Paper";
  const instructions = (request.instructions ?? "").trim().slice(0, 2000);

  const bankForPrompt = bank
    .map((q) => `Q${q.num}. [${q.difficulty}|${q.kind}] ${q.question}`)
    .join("\n");

  const prompt = `${PAPER_SETTER_SYSTEM}

${syllabus ? `CREATOR SYLLABUS (prefer matching questions):\n${syllabus}\n` : "No syllabus supplied — balance difficulty across the bank."}

SECTIONS SPEC (select EXACTLY the required count per group, arrays aligned by index):
${describeSectionsSpec(sections)}

QUESTION BANK:
${bankForPrompt}`;

  // ---- 1. AI selection (question numbers only) ----
  let selectedNums: number[][][] = [];
  let usage: LiveUsage | undefined;
  try {
    const { content, usage: u } = await chatWithAI(prompt);
    usage = u;
    const cleaned = content.replace(/```(?:json)?/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON in AI reply");
    const parsed = AISelectionSchema.safeParse(JSON.parse(cleaned.slice(start, end + 1)));
    if (!parsed.success) throw new Error("AI selection failed validation");
    selectedNums = parsed.data.sections.map((s) => s.groups.map((g) => g.nums));
  } catch (err) {
    console.warn("[question-paper] AI selection failed, using deterministic fallback:", err);
    selectedNums = [];
  }

  // ---- 2. Rehydrate + repair counts deterministically ----
  const terms = syllabusTerms(syllabus);
  const ranked = [...bank].sort((a, b) => {
    const diff = scoreBySyllabus(b, terms) - scoreBySyllabus(a, terms);
    if (diff !== 0) return diff;
    return a.num - b.num;
  });
  const used = new Set<number>();
  const takeUnused = (filter: (q: BankQuestion) => boolean, count: number): number[] => {
    const out: number[] = [];
    for (const q of ranked) {
      if (out.length >= count) break;
      if (!used.has(q.num) && filter(q)) {
        used.add(q.num);
        out.push(q.num);
      }
    }
    // Relax filter if still short.
    for (const q of ranked) {
      if (out.length >= count) break;
      if (!used.has(q.num)) {
        used.add(q.num);
        out.push(q.num);
      }
    }
    return out;
  };

  const preferredDifficulty = (marksPerQuestion: number): string =>
    marksPerQuestion <= 2 ? "easy" : marksPerQuestion <= 5 ? "medium" : "hard";

  const paperSections: PaperSection[] = sections.map((s, si) => {
    const groups: PaperGroup[] = (s.questionGroups ?? []).map((g, gi) => {
      const need = clampInt(Number(g.questionCount) || 0, 1, 50);
      const mpq = Math.max(0.5, Number(g.marksPerQuestion) || 1);
      const rule = normalizeAttempt(g.attemptRule);
      if (rule.type === "ANY_N" && (rule.count == null || rule.count <= 0)) {
        rule.count = Math.max(1, need - 1);
      }

      // Keep valid, unused AI picks; repair the rest deterministically.
      const aiNums = (selectedNums[si]?.[gi] ?? []).filter((n) => byNum.has(n) && !used.has(n));
      const kept: number[] = [];
      for (const n of aiNums) {
        if (kept.length >= need) break;
        used.add(n);
        kept.push(n);
      }
      const wantNumerical = String(g.type).toUpperCase() === "NUMERICAL";
      const wantDiff = preferredDifficulty(mpq);
      if (kept.length < need) {
        const shortfall = need - kept.length;
        const filtered = (q: BankQuestion) =>
          (wantNumerical ? q.kind === "Numerical" : true) && q.difficulty === wantDiff;
        kept.push(...takeUnused(filtered, shortfall));
      }
      // Last resort: any unused (takeUnused already relaxes, so this is safety).
      while (kept.length < need) {
        const next = bank.find((q) => !used.has(q.num));
        if (!next) break;
        used.add(next.num);
        kept.push(next.num);
      }

      const questions: PaperQuestion[] = kept.map((n) => {
        const b = byNum.get(n)!;
        return { num: b.num, question: b.question, difficulty: b.difficulty, kind: b.kind, marks: mpq };
      });

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
      const available = g.questions.reduce((s, q) => s + q.marks, 0);
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
    totalQuestions: paperSections.reduce((s, x) => s + x.totalQuestions, 0),
    totalMarks: paperSections.reduce((s, x) => s + x.sectionMarks, 0),
    durationMinutes: request.durationMinutes != null ? clampInt(request.durationMinutes, 10, 600) : undefined,
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
              return `<div class="q"><div class="q-row"><span class="q-no">Q${qNo}.</span><span class="q-text">${escapeHtml(q.question)}</span><span class="q-marks">[${q.marks} mark${q.marks !== 1 ? "s" : ""}]</span></div><div class="q-meta">${escapeHtml(q.difficulty)} · ${escapeHtml(q.kind)}</div></div>`;
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
  body { font-family: Georgia, "Times New Roman", serif; color: #111; max-width: 800px; margin: 0 auto; padding: 32px 24px; }
  .paper-head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  .paper-head h1 { font-size: 24px; margin: 0 0 8px; }
  .paper-meta { font-size: 13px; color: #444; }
  .gen-instructions { font-size: 14px; margin: 12px 0 0; font-style: italic; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section-head { display: flex; justify-content: space-between; font-size: 17px; font-weight: bold; background: #f3f4f6; padding: 8px 12px; border-radius: 6px; }
  .section-title { font-size: 14px; font-weight: bold; margin: 8px 0 0 2px; }
  .instructions { font-size: 13px; font-style: italic; margin: 6px 0 0 2px; color: #333; }
  .group { margin: 14px 0 0 4px; }
  .group-head { font-size: 14px; font-weight: bold; }
  .attempt { font-size: 12px; font-style: italic; color: #555; margin: 2px 0 8px; }
  .q { margin: 10px 0; }
  .q-row { display: flex; gap: 8px; font-size: 14px; }
  .q-no { font-weight: bold; white-space: nowrap; }
  .q-text { flex: 1; }
  .q-marks { white-space: nowrap; font-weight: bold; }
  .q-meta { font-size: 11px; color: #888; margin-left: 34px; text-transform: capitalize; }
  .paper-foot { margin-top: 32px; border-top: 2px solid #111; padding-top: 12px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
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
</body>
</html>`;
};
