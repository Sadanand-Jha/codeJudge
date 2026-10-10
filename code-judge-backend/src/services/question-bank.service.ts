/**
 * Question Bank Selection Service — select balanced assessment from curated OS bank.
 *
 * Uses a curated internal question bank, builds the expert assessment designer prompt and
 * asks the LLM to SELECT (not invent) N questions respecting chapter/topic
 * spread, importance, difficulty balance and theory/numerical mix.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { chatWithAI } from "./ai.service.js";
import type { LiveUsage } from "./ai.service.js";
import { parseQuestionsJSON } from "./question-generation.service.js";
import type { GeneratedQuestionPayload } from "./question-generation.service.js";
import { pool } from "../config/database.js";

export interface QuestionBankSelectionRequest {
  numberOfQuestions: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  /** Optional free-form hardness hint like "Hard paper" */
  hardnessHint?: string;
  /** Creator-provided syllabus/topics used to constrain and balance selection. */
  syllabus?: string;
  subjectId: number;
  chapterId?: number | null;
  topicId?: number | null;
  kind?: "any" | "theory" | "numerical";
}

export interface QuestionBankSelectionResult {
  questions: GeneratedQuestionPayload[];
  extractedText: string;
  usage?: LiveUsage;
}

const BANK_FILENAMES = [
  "Operating_Systems_200_MCQs_Single_Correct.docx",
  "Operating_Systems_200_MCQs_Single_Correct (1).docx",
  "Operating_Systems_100_Subjective_Problems (1).docx",
  "Operating_Systems_100_Subjective_Problems.docx",
];

const SYSTEM_PROMPT = `You are an expert academic assessment designer. Your task is to select the best questions from the provided question bank to create a balanced assessment.

Your selection must NOT simply choose questions randomly. You must maintain a deliberate balance across chapters/topics, importance, difficulty, and question style.

### 1. Chapter / Topic Distribution
Questions must be distributed across different chapters and major concepts.
* Do NOT select most or all questions from the same chapter.
* Select approximately 2–3 strong and important questions from a chapter before moving to other chapters.
* Prefer covering more chapters rather than selecting many questions from one chapter.
* No single chapter should dominate the assessment.
* Avoid selecting multiple questions that test essentially the same concept.
* If two questions are very similar, select only the better one.

For example, instead of selecting:
CPU Scheduling × 7, Deadlocks × 1, Memory Management × 1, File Systems × 1
prefer something like:
CPU Scheduling × 2, Processes & Threads × 2, Deadlocks × 2, Memory Management × 2, File Systems × 1, Disk / I/O × 1

### 2. Importance-Based Selection
Within every chapter, prioritize the most academically important concepts.
Prefer questions that test fundamental concepts, important syllabus concepts, understanding rather than trivial definitions, reasoning/comparison/analysis/calculation, and foundational concepts.

### 3. Difficulty Balance
Maintain the requested difficulty distribution strictly.
Possible levels: Easy, Medium, Hard
If user specifies distribution, follow it as closely as mathematically possible.
For 10 Qs Easy 40% Medium 30% Hard 30% → 4 Easy, 3 Medium, 3 Hard
Difficulty must be balanced across chapters as well.

### 4. Theory + Numerical Balance
Healthy mix:
* Conceptual / Theory
* Analytical
* Numerical / Calculation-based
* Scenario-based or application
Theory ~55–70%, Numerical ~30–45% unless subject requires otherwise.

### 5. Difficulty Should Reflect Actual Cognitive Demand
Easy: definitions, basic concepts, simple calculations
Medium: applying concepts, comparing approaches, multi-step reasoning
Hard: deeper analysis, multiple concepts, complex numerical work, justification, algorithmic reasoning

### 6. Avoid Repetition
Never select multiple questions that essentially ask the same thing with different wording.

### 7. Prefer Breadth + Depth
Test both breadth across several OS topics and depth on important concepts.

### 8. Recommended OS Coverage
When bank allows, distribute among: OS Fundamentals, Processes, Threads, Process States/PCB, CPU Scheduling, Process Synchronization, Semaphores/Mutex/Monitors, Deadlocks, Main Memory Management, Paging/Segmentation, Virtual Memory, Page Replacement, File Systems, File Allocation, Disk Scheduling, I/O Management, Protection/Security, OS Architecture, Virtualization

### 9. Selection Priority
1. Correct difficulty distribution
2. Coverage of different important chapters
3. Academic importance
4. Avoidance of duplicates
5. Theory/numerical balance
6. Variety in reasoning required
7. Overall quality

### 10. Final Validation
Verify total count correct, difficulty distribution maintained, multiple chapters covered, no chapter overrepresented, important concepts prioritized, duplicates avoided, theory/numerical balanced, paper progresses from foundational to challenging.

Return only questions that exist in the provided question bank. Do not invent new questions.`;

async function resolveBankPath(): Promise<string | null> {
  const candidates: string[] = [];
  if (process.env.QUESTION_BANK_PATH) candidates.push(process.env.QUESTION_BANK_PATH);
  // project cwd public
  candidates.push(path.resolve(process.cwd(), "public", BANK_FILENAMES[0]));
  candidates.push(path.resolve(process.cwd(), "code-judge-backend/public", BANK_FILENAMES[0]));
  // relative to this file: src/services -> ../../public
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  for (const n of BANK_FILENAMES) {
    candidates.push(path.resolve(__dirname, "../../public", n));
    candidates.push(path.resolve(__dirname, "../../../public", n));
    candidates.push(path.resolve(__dirname, "../../..", "public", n));
  }
  // frontend public mirror
  candidates.push(path.resolve(process.cwd(), "../code-judge-frontend/public", BANK_FILENAMES[0]));
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

async function extractDocxText(buffer: Buffer): Promise<string> {
  // mammoth extracts raw text with style map; fallback to raw if it fails
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 100) return result.value;
  } catch (e) {
    console.warn("mammoth extraction failed, fallback:", e);
  }
  // fallback: try decode as text
  return buffer.toString("utf-8");
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type ParsedBankQuestion = {
  num: number;
  difficulty: string;
  question: string;
  options: string[];
  answer: string;
  raw: string;
  chapter: string;
};

const normalizeQuestionText = (value: string) =>
  value.replace(/^Q\d+\.\s*/i, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

/**
 * Parse the answer-marked MCQs directly from the Word document. The model is
 * allowed to choose questions, but it is never trusted as the answer key.
 */
function parseMarkedBankQuestions(bankText: string): ParsedBankQuestion[] {
  const lines = bankText.split("\n").map((line) => line.trim()).filter(Boolean);
  const parsed: ParsedBankQuestion[] = [];
  let currentChapter = "Operating Systems";

  for (let i = 0; i < lines.length; i++) {
    const chapterMatch = lines[i].match(/^Chapter\s+\d+:\s*(.+)$/i);
    if (chapterMatch) {
      currentChapter = chapterMatch[1].trim();
      continue;
    }
    const questionMatch = lines[i].match(/^Q(\d+)\.\s*(.+)/i);
    if (!questionMatch) continue;

    const num = Number(questionMatch[1]);
    const question = questionMatch[2].trim();
    let difficulty = "medium";
    const options: string[] = [];
    let answer = "";

    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const line = lines[j];
      if (/^Q\d+\./i.test(line) || /^Chapter\s+\d+:/i.test(line)) break;

      const difficultyMatch = line.match(/^Difficulty:\s*(Easy|Medium|Hard)/i);
      if (difficultyMatch) difficulty = difficultyMatch[1].toLocaleLowerCase();

      const optionMatch = line.match(/^([A-D])\.\s*(.+)/);
      if (optionMatch && options.length < 4) options.push(optionMatch[2].trim());

      const markedAnswer = line.match(/^Correct Answer:\s*([A-D])\.?(?:\s+(.+))?$/i);
      if (markedAnswer) {
        const markedIndex = markedAnswer[1].toUpperCase().charCodeAt(0) - 65;
        const markedText = markedAnswer[2]?.trim();
        answer = options[markedIndex] ?? markedText ?? "";
        i = j;
        break;
      }
    }

    if (options.length === 4 && answer && options.includes(answer)) {
      parsed.push({ num, difficulty, question, options, answer, raw: question, chapter: currentChapter });
    }
  }

  return parsed;
}

export const generateFromQuestionBank = async (
  request: QuestionBankSelectionRequest
): Promise<QuestionBankSelectionResult> => {
  const numberOfQuestions = clamp(request.numberOfQuestions || 10, 1, 50);

  let easy = request.easyCount;
  let medium = request.mediumCount;
  let hard = request.hardCount;

  // default distribution 40/30/30 if not provided
  if (easy == null && medium == null && hard == null) {
    easy = Math.round(numberOfQuestions * 0.4);
    medium = Math.round(numberOfQuestions * 0.3);
    hard = numberOfQuestions - (easy + medium);
    // adjust for 10 -> 4,3,3
    if (numberOfQuestions === 10) {
      easy = 4;
      medium = 3;
      hard = 3;
    }
  } else {
    easy = easy ?? 0;
    medium = medium ?? 0;
    hard = hard ?? 0;
    const sum = easy + medium + hard;
    if (sum !== numberOfQuestions) {
      // normalize proportionally if caller sent counts that don't sum
      if (sum === 0) {
        easy = Math.round(numberOfQuestions * 0.4);
        medium = Math.round(numberOfQuestions * 0.3);
        hard = numberOfQuestions - easy - medium;
      } else {
        // leave as is but clamp hard to fill remainder
        hard = numberOfQuestions - easy - medium;
        if (hard < 0) hard = 0;
      }
    }
  }

  const subjectId = Number(request.subjectId);
  const chapterId = request.chapterId == null ? null : Number(request.chapterId);
  const topicId = request.topicId == null ? null : Number(request.topicId);
  const kind = String(request.kind ?? "any").toLowerCase();
  if (!Number.isInteger(subjectId) || subjectId <= 0) throw new Error("Select a subject.");
  if (topicId !== null && chapterId === null) throw new Error("Select a chapter before selecting a topic.");
  if (!["any", "theory", "numerical"].includes(kind)) throw new Error("Select a valid category.");

  // Selection source is the curated MCQ Word file in backend public/
  // (e.g. Operating_Systems_200_MCQs_Single_Correct.docx). That file covers
  // Operating Systems only, so resolve the requested scope names here and
  // constrain file selection to them further below.
  const subjectRow = await pool.query(`SELECT subject_name FROM subjects WHERE id = $1`, [subjectId]);
  const subjectName: string = subjectRow.rows[0]?.subject_name ? String(subjectRow.rows[0].subject_name) : "";
  if (!subjectName) throw new Error("Select a subject.");
  if (!/operating\s*systems?|\bos\b/i.test(subjectName)) {
    throw new Error(`The curated MCQ bank currently covers Operating Systems only. "${subjectName}" is not available yet.`);
  }
  const scopeNames: string[] = [];
  if (chapterId !== null) {
    const chapterRow = await pool.query(
      `SELECT chapter_name FROM subject_chapters WHERE id = $1 AND subject_id = $2`,
      [chapterId, subjectId]
    );
    const chapterName: string = chapterRow.rows[0]?.chapter_name ? String(chapterRow.rows[0].chapter_name) : "";
    if (!chapterName) throw new Error("Select a valid chapter.");
    scopeNames.push(chapterName);
  }
  if (topicId !== null) {
    const topicRow = await pool.query(`SELECT topic_name FROM chapter_topics WHERE id = $1`, [topicId]);
    const topicName: string = topicRow.rows[0]?.topic_name ? String(topicRow.rows[0].topic_name) : "";
    if (!topicName) throw new Error("Select a valid topic.");
    scopeNames.push(topicName);
  }

  const bankPath = await resolveBankPath();
  if (!bankPath) {
    throw new Error("Question generation is temporarily unavailable. Please try again later.");
  }

  const buffer = await fs.readFile(bankPath as string);
  let bankText = await extractDocxText(buffer);
  if (!bankText.trim()) {
    throw new Error("Question generation is temporarily unavailable. Please try again later.");
  }
  // truncate to keep prompt small but keep all 100 Qs (approx 30k chars)
  const truncated = bankText.length > 180_000 ? bankText.slice(0, 180_000) : bankText;
  const parsedBank = parseMarkedBankQuestions(truncated);
  if (parsedBank.length === 0) {
    throw new Error("The available curriculum data could not be processed safely.");
  }
  // Creator syllabus plus the resolved chapter/topic names all act as
  // scope terms for the file bank (matched against chapter + question text).
  const syllabus = [request.syllabus?.trim(), ...scopeNames].filter(Boolean).join("\n");
  const ignoredSyllabusWords = new Set([
    "and", "the", "with", "from", "into", "unit", "chapter", "topic", "topics",
    "module", "modules", "include", "including", "about", "basics", "introduction",
  ]);
  const syllabusTerms = syllabus
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3 && !ignoredSyllabusWords.has(term));
  const eligibleBank = syllabusTerms.length === 0
    ? parsedBank
    : parsedBank.filter((question) => {
        const searchable = `${question.chapter} ${question.question}`.toLocaleLowerCase();
        return syllabusTerms.some((term) => searchable.includes(term));
      });
  if (eligibleBank.length < numberOfQuestions) {
    throw new Error(
      "We couldn't generate the requested number of questions for this syllabus. Add broader topics or request fewer questions."
    );
  }
  const bankByQuestion = new Map(
    eligibleBank.map((question) => [normalizeQuestionText(question.question), question])
  );
  const bankForPrompt = eligibleBank.map((question) => {
    const optionLines = question.options
      .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
      .join("\n");
    const answerIndex = question.options.indexOf(question.answer);
    return `Chapter: ${question.chapter}\nQ${question.num}. ${question.question}\nDifficulty: ${question.difficulty}\n${optionLines}\nCorrect Answer: ${String.fromCharCode(65 + answerIndex)}. ${question.answer}`;
  }).join("\n\n");

  const distributionLine = `Requested: exactly ${numberOfQuestions} questions — Easy=${easy}, Medium=${medium}, Hard=${hard}.`;
  const hardnessHintLine = request.hardnessHint ? `Overall hardness hint: ${request.hardnessHint}.` : "";
  const syllabusLine = syllabus
    ? `CREATOR SYLLABUS (strict scope):\n${syllabus}\nSelect questions ONLY from these syllabus topics. Balance the paper across the distinct syllabus topics instead of overusing one topic.`
    : "No syllabus was supplied; balance coverage across the full question bank.";

  const prompt = `${SYSTEM_PROMPT}

${distributionLine}
${hardnessHintLine}
${syllabusLine}
You must select exactly ${numberOfQuestions} questions from the bank below with the difficulty counts Easy=${easy}, Medium=${medium}, Hard=${hard}.

Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "questions": [
    {
      "question": "exact question text as it appears in the bank (e.g., 'Which of the following is the primary purpose of an operating system?')",
      "type": "mcq",
      "difficulty": "easy" | "medium" | "hard",
      "options": ["option A text (without leading A. label)", "option B text", "option C text", "option D text"],
      "correctAnswer": "exact correct option text (must exactly match one of the 4 options, without leading label)",
      "correctOptionIndex": 0,
      "explanation": "brief note why selected (optional)",
      "hint": "small hint (optional)",
      "tags": ["OS", "chapter-topic"]
    }
  ]
}
Rules:
- Each selected question is a single-correct MCQ: always provide exactly 4 options (strip leading labels like "A. ", "B. ").
- "correctAnswer" is REQUIRED for every question. It must be the exact text of the correct option and must match one of the provided options.
- "correctOptionIndex" is REQUIRED and zero-based: 0=A, 1=B, 2=C, 3=D. It must identify the same option as "correctAnswer".
- The bank shows the answer on the line "Correct Answer: X. <text>". Copy that answer faithfully; do not guess, infer, or substitute a different option.
- Preserve the question wording exactly; do not rephrase or add facts not in the bank.
- Ensure difficulty field matches the bank label for that question.
- Do NOT invent questions not in the bank.
- Do NOT select a question outside the creator syllabus when a syllabus is provided.
- Cover the supplied syllabus topics as evenly as the available bank and requested difficulty counts allow.
- No subjective handling — all are MCQs.

QUESTION BANK:
${bankForPrompt}`;

  // Try LLM selection; fallback to deterministic local selection if LLM unavailable/fails
  try {
    const { content, usage } = await chatWithAI(prompt);
    const questions = parseQuestionsJSON(content);

    // Rehydrate every selected question from the parsed Word document. This
    // guarantees that options and answers come from the marked source even if
    // the model omits, changes, or hallucinates an answer field.
    const canonicalQuestions = questions.map((question) => {
      const source = bankByQuestion.get(normalizeQuestionText(question.question));
      if (!source) {
        throw new Error("A generated question failed validation. Please try again.");
      }
      const correctOptionIndex = source.options.indexOf(source.answer);
      return {
        ...question,
        question: source.question,
        type: "mcq",
        difficulty: source.difficulty,
        options: source.options,
        answer: source.answer,
        correctAnswer: source.answer,
        correctOptionIndex,
      } satisfies GeneratedQuestionPayload;
    });

    if (canonicalQuestions.length !== numberOfQuestions) {
      console.warn(`[question-bank] model returned ${canonicalQuestions.length} vs requested ${numberOfQuestions}, slicing`);
      if (canonicalQuestions.length > numberOfQuestions) {
        canonicalQuestions.length = numberOfQuestions;
      }
    }

    if (canonicalQuestions.length > 0) return { questions: canonicalQuestions, extractedText: truncated, usage };
    throw new Error("AI returned zero questions");
  } catch (aiError) {
    console.warn("[question-bank] AI selection failed, using deterministic fallback:", aiError);
    // Deterministic fallback: parse MCQ bank structure
    // MCQ bank lines:
    //   Q<num>. <question>
    //   Difficulty: Easy|Medium|Hard
    //   A. ...
    //   B. ...
    //   C. ...
    //   D. ...
    //   Correct Answer: X. <text>
    const parsed = eligibleBank;
    // Never manufacture a correct answer. If the bank could not be parsed with
    // its answer key intact, fail instead of silently marking option A.
    if (parsed.length === 0) {
      throw new Error("The generated questions could not be validated safely", { cause: aiError });
    }

    const bucket = (diff: string) => parsed.filter((p) => p.difficulty === diff);
    const easyPool = bucket("easy");
    const medPool = bucket("medium");
    const hardPool = bucket("hard");

    const pick = (pool: ParsedBankQuestion[], count: number): ParsedBankQuestion[] => {
      if (count <= 0) return [];
      const byChapter = new Map<string, ParsedBankQuestion[]>();
      for (const question of pool) {
        const chapterQuestions = byChapter.get(question.chapter) ?? [];
        chapterQuestions.push(question);
        byChapter.set(question.chapter, chapterQuestions);
      }
      const chapterPools = [...byChapter.values()].map((questions) =>
        questions.sort((a, b) => ((a.num * 7) % 97) - ((b.num * 7) % 97))
      );
      const out: ParsedBankQuestion[] = [];
      let round = 0;
      while (out.length < count) {
        let addedThisRound = false;
        for (const chapterPool of chapterPools) {
          const candidate = chapterPool[round];
          if (candidate) {
            out.push(candidate);
            addedThisRound = true;
            if (out.length === count) break;
          }
        }
        if (!addedThisRound) break;
        round++;
      }
      return out.slice(0, count);
    };

    const selected: ParsedBankQuestion[] = [...pick(easyPool, easy!), ...pick(medPool, medium!), ...pick(hardPool, hard!)];
    if (selected.length < numberOfQuestions) {
      const remaining = parsed.filter((p) => !selected.includes(p));
      selected.push(...remaining.slice(0, numberOfQuestions - selected.length));
    }

    const questions: GeneratedQuestionPayload[] = selected.slice(0, numberOfQuestions).map((p) => ({
      question: p.question,
      type: "mcq",
      difficulty: p.difficulty,
      options: p.options,
      answer: p.answer,
      correctAnswer: p.answer,
      correctOptionIndex: p.options.findIndex((option) => option === p.answer),
      explanation: `Selected for balanced coverage`,
      hint: "",
      tags: [p.difficulty],
    }));

    return { questions, extractedText: truncated, usage: undefined };
  }
};
