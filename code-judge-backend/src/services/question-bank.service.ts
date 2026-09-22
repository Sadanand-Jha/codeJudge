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

export interface QuestionBankSelectionRequest {
  numberOfQuestions: number;
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  /** Optional free-form hardness hint like "Hard paper" */
  hardnessHint?: string;
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
  candidates.push("/home/sadanandjha/Desktop/Projects/codeJudge/code-judge-backend/public/Operating_Systems_200_MCQs_Single_Correct.docx");

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

  const bankPath = await resolveBankPath();
  if (!bankPath) {
    throw new Error("Curated question bank is temporarily unavailable. Please try again later.");
  }

  const buffer = await fs.readFile(bankPath);
  let bankText = await extractDocxText(buffer);
  if (!bankText.trim()) {
    throw new Error("Curated question bank is temporarily unavailable. Please try again later.");
  }
  // truncate to keep prompt small but keep all 100 Qs (approx 30k chars)
  const truncated = bankText.length > 180_000 ? bankText.slice(0, 180_000) : bankText;

  const distributionLine = `Requested: exactly ${numberOfQuestions} questions — Easy=${easy}, Medium=${medium}, Hard=${hard}.`;
  const hardnessHintLine = request.hardnessHint ? `Overall hardness hint: ${request.hardnessHint}.` : "";

  const prompt = `${SYSTEM_PROMPT}

${distributionLine}
${hardnessHintLine}
You must select exactly ${numberOfQuestions} questions from the bank below with the difficulty counts Easy=${easy}, Medium=${medium}, Hard=${hard}.

Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "questions": [
    {
      "question": "exact question text as it appears in the bank (e.g., 'Which of the following is the primary purpose of an operating system?')",
      "type": "mcq",
      "difficulty": "easy" | "medium" | "hard",
      "options": ["option A text (without leading A. label)", "option B text", "option C text", "option D text"],
      "answer": "exact correct option text (must exactly match one of the 4 options, without leading label)",
      "explanation": "brief note why selected (optional)",
      "hint": "small hint (optional)",
      "tags": ["OS", "chapter-topic"]
    }
  ]
}
Rules:
- Each selected question is a single-correct MCQ: always provide exactly 4 options (strip leading labels like "A. ", "B. ").
- "answer" must be the exact text of the correct option and must match one of the provided options. The bank shows the correct answer on the line "Correct Answer: X. <text>" — resolve that to the actual option text.
- Preserve the question wording exactly; do not rephrase or add facts not in the bank.
- Ensure difficulty field matches the bank label for that question.
- Do NOT invent questions not in the bank.
- No subjective handling — all are MCQs.

QUESTION BANK:
${truncated}`;

  // Try LLM selection; fallback to deterministic local selection if LLM unavailable/fails
  try {
    const { content, usage } = await chatWithAI(prompt);
    const questions = parseQuestionsJSON(content);

    if (questions.length !== numberOfQuestions) {
      console.warn(`[question-bank] model returned ${questions.length} vs requested ${numberOfQuestions}, slicing`);
      if (questions.length > numberOfQuestions) {
        questions.length = numberOfQuestions;
      }
    }

    if (questions.length > 0) return { questions, extractedText: truncated, usage };
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
    const lines = truncated.split("\n").map((l) => l.trim()).filter(Boolean);
    type Parsed = { num: number; difficulty: string; question: string; options: string[]; answer: string; raw: string };
    const parsed: Parsed[] = [];
    for (let i = 0; i < lines.length; i++) {
      const qMatch = lines[i].match(/^Q(\d+)\.\s*(.+)/i);
      if (!qMatch) continue;
      const num = parseInt(qMatch[1], 10);
      const question = qMatch[2].trim();
      let difficulty = "medium";
      let options: string[] = [];
      let answer = "";
      // Look ahead up to ~8 lines for Difficulty, options, Correct Answer
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const line = lines[j];
        const diffMatch = line.match(/^Difficulty:\s*(Easy|Medium|Hard)/i);
        if (diffMatch) difficulty = diffMatch[1].toLowerCase();
        const optMatch = line.match(/^[A-D]\.\s*(.+)/);
        if (optMatch && options.length < 4) options.push(optMatch[1].trim());
        const ansMatch = line.match(/^Correct Answer:\s*[A-D]\.\s*(.+)/i);
        if (ansMatch) {
          answer = ansMatch[1].trim();
          // also advance i to avoid re-parsing
          i = j;
          break;
        }
        // Handle "Correct Answer: B." without dot text fallback -> use options letter
        const ansLetterOnly = line.match(/^Correct Answer:\s*([A-D])\.?\s*$/i);
        if (ansLetterOnly && options.length === 4) {
          const idx = ansLetterOnly[1].toUpperCase().charCodeAt(0) - 65;
          answer = options[idx] ?? "";
          i = j;
          break;
        }
        if (/^Q\d+\./.test(line)) break;
        if (/^Chapter \d+:/.test(line)) break;
      }
      if (options.length === 4 && answer) {
        parsed.push({ num, difficulty, question, options, answer, raw: question });
      } else if (options.length === 4) {
        // if answer not found but options present, use first option as fallback
        parsed.push({ num, difficulty, question, options, answer: options[0], raw: question });
      }
    }
    // Legacy fallback for subjective format if MCQ parse found nothing
    if (parsed.length === 0) {
      const qPattern = /^(\d+)\.\s*\[(Easy|Medium|Hard)\s*\|\s*([^\]]+)\]\s*(.+)/i;
      type LegacyParsed = { num: number; difficulty: string; raw: string; question: string; options: string[]; answer: string };
      const legacy: LegacyParsed[] = [];
      for (const line of lines) {
        const m = line.match(qPattern);
        if (m) legacy.push({ num: parseInt(m[1], 10), difficulty: m[2].toLowerCase(), raw: m[4].trim(), question: m[4].trim(), options: [], answer: "" });
      }
      if (legacy.length === 0) throw aiError;
      const bucket = (diff: string) => legacy.filter((p) => p.difficulty === diff);
      const pickLegacy = (pool: LegacyParsed[], count: number) => {
        if (count <= 0) return [];
        const shuffled = [...pool].sort((a, b) => ((a.num * 7) % 97) - ((b.num * 7) % 97));
        const step = Math.max(1, Math.floor(shuffled.length / Math.max(count, 1)));
        const out: LegacyParsed[] = [];
        for (let k = 0; k < count && k * step < shuffled.length; k++) out.push(shuffled[(k * step) % shuffled.length]);
        let idx = 0;
        while (out.length < count && idx < shuffled.length) { if (!out.includes(shuffled[idx])) out.push(shuffled[idx]); idx++; }
        return out.slice(0, count);
      };
      const sel = [...pickLegacy(bucket("easy"), easy!), ...pickLegacy(bucket("medium"), medium!), ...pickLegacy(bucket("hard"), hard!)];
      if (sel.length < numberOfQuestions) {
        const remaining = legacy.filter((p) => !sel.includes(p));
        sel.push(...remaining.slice(0, numberOfQuestions - sel.length));
      }
      const questions: GeneratedQuestionPayload[] = sel.slice(0, numberOfQuestions).map((p) => ({ question: p.raw, type: "short", difficulty: p.difficulty, options: [], answer: "", explanation: `Selected for balanced coverage`, hint: "", tags: [p.difficulty] }));
      return { questions, extractedText: truncated, usage: undefined };
    }

    const bucket = (diff: string) => parsed.filter((p) => p.difficulty === diff);
    const easyPool = bucket("easy");
    const medPool = bucket("medium");
    const hardPool = bucket("hard");

    const pick = (pool: Parsed[], count: number): Parsed[] => {
      if (count <= 0) return [];
      const shuffled = [...pool].sort((a, b) => ((a.num * 7) % 97) - ((b.num * 7) % 97));
      const step = Math.max(1, Math.floor(shuffled.length / Math.max(count, 1)));
      const out: Parsed[] = [];
      for (let k = 0; k < count && k * step < shuffled.length; k++) {
        out.push(shuffled[(k * step) % shuffled.length]);
      }
      let idx = 0;
      while (out.length < count && idx < shuffled.length) {
        if (!out.includes(shuffled[idx])) out.push(shuffled[idx]);
        idx++;
      }
      return out.slice(0, count);
    };

    const selected: Parsed[] = [...pick(easyPool, easy!), ...pick(medPool, medium!), ...pick(hardPool, hard!)];
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
      explanation: `Selected for balanced coverage`,
      hint: "",
      tags: [p.difficulty],
    }));

    return { questions, extractedText: truncated, usage: undefined };
  }
};
