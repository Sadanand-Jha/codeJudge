import ExcelJS from "exceljs";
import { chatWithAI } from "./ai.service.js";
import type { LiveUsage } from "./ai.service.js";
import {
  extractTextWithDocling,
  isDoclingAvailable,
} from "./docling-extract.service.js";

export interface UploadedFileInput {
  name: string;
  buffer: Buffer;
}

export interface GeneratedQuestionPayload {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  hint?: string;
  type?: string;
  difficulty?: string;
  tags?: string[];
}

export interface QuestionGenerationResult {
  questions: GeneratedQuestionPayload[];
  extractedText: string;
  usage?: LiveUsage;
}

export interface QuestionGenerationRequest {
  files: UploadedFileInput[];
  numberOfQuestions: number;
  questionTypes: string[];
  difficulty: string[];
  bloomsLevel: string;
  includeExplanations: boolean;
  includeHints: boolean;
  includeReferenceNotes: boolean;
  includeTags: boolean;
}

/**
 * Formats we can read ourselves (fast path, no external service needed).
 */
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "yml",
  "yaml",
  "sql",
  "log",
  "ini",
  "toml",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "java",
  "c",
  "cpp",
  "cc",
  "h",
  "hpp",
  "go",
  "rs",
  "rb",
  "php",
  "sh",
  "bash",
]);

/**
 * Formats that need real document parsing (→ Docling Serve): PDFs,
 * PowerPoint, Word, archives, and images.
 */
const DOCLING_EXTENSIONS = new Set([
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "xls",
  "zip",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
]);

/**
 * Best-effort text extraction:
 *  - plain text-based files decode directly
 *  - Excel is read cell-by-cell
 *  - everything else (PDF, PowerPoint, Word, archives, images) is sent to
 *    Docling Serve when it's available, falling back to a raw decode otherwise.
 */
const decodeText = (buffer: Buffer): string => {
  const raw = buffer.toString("utf-8");
  let controlChars = 0;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code === 0) controlChars += 10;
    else if (code < 9 || (code > 13 && code < 32)) controlChars++;
  }
  if (controlChars / Math.max(raw.length, 1) > 0.02) return "";
  return raw;
};

const extractExcel = async (buffer: Buffer): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    if (lines.length >= 3000) return;
    const header = `${sheet.name} (${sheet.actualRowCount} rows):`;
    lines.push(header);
    const rowValues = (row: ExcelJS.Row) =>
      (row.values as unknown as (unknown[] | { text?: string; richText?: { text: string }[] })[])
        .slice(1)
        .map((cell) => {
          if (cell && typeof cell === "object") {
            const c = cell as { text?: string; richText?: { text: string }[] };
            if (typeof c.text === "string") return c.text;
            if (Array.isArray(c.richText)) return c.richText.map((r) => r.text).join("");
          }
          return cell == null ? "" : String(cell);
        })
        .filter((v) => String(v).trim().length > 0)
        .join(" | ");

    sheet.eachRow({ includeEmpty: false }, (row) => {
      const text = rowValues(row);
      if (text) lines.push(text);
    });
  });

  return lines.slice(0, 3000).join("\n");
};

export const extractFileText = async (
  file: UploadedFileInput,
  doclingAvailable: boolean
): Promise<string> => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  // Fast paths we handle natively.
  if (ext === "xlsx" || ext === "xlsm") {
    try {
      const excelText = await extractExcel(file.buffer);
      if (excelText.trim()) return excelText;
    } catch (error) {
      console.warn(`Excel extraction failed for ${file.name}:`, error);
    }
  }

  if (TEXT_EXTENSIONS.has(ext)) return decodeText(file.buffer);

  // Binary/documents: delegate to Docling Serve when reachable.
  if (DOCLING_EXTENSIONS.has(ext) && doclingAvailable) {
    try {
      const doclingText = await extractTextWithDocling(file.buffer, file.name);
      if (doclingText.trim()) return doclingText;
    } catch (error) {
      console.warn(`Docling extraction failed for ${file.name}:`, error);
    }
  }

  // Last resort — a raw utf-8 decode (works for trickier text files).
  return decodeText(file.buffer);
};

const stripJsonFences = (content: string): string => {
  const withoutFences = content.replace(/```(?:json)?/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return withoutFences;
  return withoutFences.slice(start, end + 1);
};

const parseQuestionsJSON = (
  content: string
): GeneratedQuestionPayload[] => {
  const slice = stripJsonFences(content);
  const parsed = JSON.parse(slice) as unknown;

  const candidate =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};

  const list = Array.isArray(candidate.questions)
    ? (candidate.questions as unknown[])
    : Array.isArray(parsed)
      ? (parsed as unknown[])
      : [];

  const questions = list
    .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
    .map((q) => ({
      question: String(q.question ?? q.content ?? "").trim(),
      options: Array.isArray(q.options)
        ? (q.options as unknown[]).map((o) => String(o).trim()).filter(Boolean)
        : [],
      answer: q.answer != null ? String(q.answer).trim() : "",
      explanation: typeof q.explanation === "string" ? q.explanation : undefined,
      hint: typeof q.hint === "string" ? q.hint : undefined,
      type: typeof q.type === "string" ? q.type : undefined,
      difficulty: typeof q.difficulty === "string" ? q.difficulty : undefined,
      tags: Array.isArray(q.tags)
        ? (q.tags as unknown[]).map((t) => String(t)).filter(Boolean)
        : undefined,
    }))
    .filter((q) => q.question.length > 0);

  if (questions.length === 0) {
    throw new Error("AI response did not contain any questions");
  }
  return questions;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Extract readable text from the uploaded files, send everything to the model,
 * and return strictly-parsed `{ questions: [...] }`.
 */
export const generateQuestionsFromFiles = async (
  request: QuestionGenerationRequest
): Promise<QuestionGenerationResult> => {
  const { files } = request;
  if (!files || files.length === 0) {
    throw new Error("At least one file is required");
  }

  const doclingAvailable = await isDoclingAvailable();

  const extracted: string[] = [];
  for (const file of files) {
    const text = await extractFileText(file, doclingAvailable);
    if (text.trim()) {
      extracted.push(`--- ${file.name} ---\n${text.trim()}`);
    }
  }

  if (extracted.length === 0) {
    throw new Error(
      "Could not read readable text from the uploaded file(s). Please upload a text-based file (.txt, .md, .csv, .xlsx)."
    );
  }

  const sourceText = extracted.join("\n\n");
  const truncated =
    sourceText.length > 200_000 ? sourceText.slice(0, 200_000) : sourceText;

  const questionTypeList = request.questionTypes.length
    ? request.questionTypes.join(", ")
    : "multiple choice";
  const difficultyList = request.difficulty.length
    ? request.difficulty.join(", ")
    : "medium";

  const extras: string[] = [];
  if (request.includeExplanations) extras.push("a concise explanation");
  if (request.includeHints) extras.push("a short hint");
  if (request.includeReferenceNotes) extras.push("brief reference notes");
  if (request.includeTags) extras.push("1-3 topic tags");
  const extrasLine =
    extras.length > 0 ? ` Each question may also include ${extras.join(", ")}.` : "";

  const prompt = `You are a quiz generator. Based strictly on the study material below,
generate exactly ${clamp(request.numberOfQuestions, 1, 50)} quiz questions.

Question types to use (mixed): ${questionTypeList}.
Target difficulty: ${difficultyList}.
Bloom's taxonomy level: ${request.bloomsLevel || "Understand"}.${extrasLine}

Return ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "questions": [
    {
      "question": "the question text",
      "type": "mcq" | "true_false" | "short",
      "difficulty": "easy" | "medium" | "hard" | "expert",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "answer": "the correct option text (or the exact expected answer for non-choice types)",
      "explanation": "why this is correct",
      "hint": "a small hint",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- For multiple-choice questions always provide 4 options and ensure "answer" exactly matches one of them.
- For true/false use options ["True", "False"].
- Do not invent facts not present in the material.

STUDY MATERIAL:
${truncated}`;

  const { content, usage } = await chatWithAI(prompt);

  const questions = parseQuestionsJSON(content);
  return { questions, extractedText: truncated, usage };
};