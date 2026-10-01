/**
 * Test Section Generation Controller
 *
 * Handles safe document/image uploads and returns AI-generated section structure.
 * All derived marks are computed server-side — the AI only provides
 * raw question counts and marks-per-question.
 */
import type { Request, Response } from "express";
import path from "node:path";
import sharp from "sharp";
import { generateSectionsFromPDF } from "../services/testSectionGeneration.service.js";
import { generateQuestionPaper, renderPaperHtml, generateSubjectiveQuestions, getQuestionGeneratorCatalog } from "../services/question-paper.service.js";
import type { PaperSectionInput } from "../services/question-paper.service.js";

const MAX_TOTAL_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".pptx", ".xlsx", ".txt", ".md", ".csv", ".tsv", ".json",
  ".png", ".jpg", ".jpeg", ".webp",
]);
const OFFICE_EXTENSIONS = new Set([".docx", ".pptx", ".xlsx"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".tsv", ".json"]);

const startsWith = (buffer: Buffer, signature: number[]) =>
  buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);

/** Reject archive bombs before a document parser receives an Office container. */
const assertSafeOfficeZip = (buffer: Buffer) => {
  // Find the ZIP end-of-central-directory record in the trailing 64 KiB.
  const end = Math.max(0, buffer.length - 65_557);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= end; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0 || eocd + 22 > buffer.length) throw new Error("Office file has an invalid archive structure.");
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount > 1_000 || centralSize > 8 * 1024 * 1024 || centralOffset + centralSize > buffer.length) {
    throw new Error("Office file exceeds safe archive limits.");
  }

  let offset = centralOffset;
  let compressedTotal = 0;
  let uncompressedTotal = 0;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Office file has an invalid archive structure.");
    }
    const compressed = buffer.readUInt32LE(offset + 20);
    const uncompressed = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    // ZIP64 archives are intentionally rejected instead of being parsed with
    // ambiguous size metadata.
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) {
      throw new Error("ZIP64 Office archives are not supported.");
    }
    compressedTotal += compressed;
    uncompressedTotal += uncompressed;
    if (uncompressedTotal > 100 * 1024 * 1024 || (compressedTotal > 0 && uncompressedTotal / compressedTotal > 100)) {
      throw new Error("Office file exceeds safe extraction limits.");
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
};

const assertSafeUpload = async (file: Express.Multer.File) => {
  const extension = path.extname(file.originalname).toLocaleLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file type. Upload PDF, Word, PowerPoint, Excel, text, or PNG/JPEG/WebP images only.");
  }
  if (file.size <= 0 || file.size > MAX_TOTAL_UPLOAD_BYTES) {
    throw new Error("Each file must be between 1 byte and 2MB.");
  }
  if (/\0/.test(file.originalname) || /[\\/]/.test(file.originalname)) {
    throw new Error("Invalid file name.");
  }

  const { buffer } = file;
  if (extension === ".pdf") {
    if (!startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new Error("The uploaded file is not a valid PDF.");
    const pdfText = buffer.toString("latin1");
    if (/\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/i.test(pdfText)) {
      throw new Error("PDF contains active or embedded content and cannot be processed.");
    }
  } else if (OFFICE_EXTENSIONS.has(extension)) {
    if (!startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) throw new Error("The uploaded Office file has an invalid signature.");
    assertSafeOfficeZip(buffer);
  } else if (extension === ".png") {
    if (!startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw new Error("The uploaded file is not a valid PNG image.");
  } else if (extension === ".jpg" || extension === ".jpeg") {
    if (!startsWith(buffer, [0xff, 0xd8, 0xff])) throw new Error("The uploaded file is not a valid JPEG image.");
  } else if (extension === ".webp") {
    if (!startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) || buffer.toString("ascii", 8, 12) !== "WEBP") throw new Error("The uploaded file is not a valid WebP image.");
  } else if (TEXT_EXTENSIONS.has(extension)) {
    const controls = [...buffer].filter((byte) => byte === 0 || (byte < 9 || (byte > 13 && byte < 32))).length;
    if (controls / Math.max(buffer.length, 1) > 0.02) throw new Error("Text files must contain readable text.");
  }

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    try {
      await sharp(buffer, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
    } catch {
      throw new Error("Image could not be verified safely.");
    }
  }
};

export const generateSections = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ success: false, message: "Please upload at least one supported document or image." });
      return;
    }
    if (files.length > 5) {
      res.status(400).json({ success: false, message: "Upload up to five files at a time." });
      return;
    }
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_UPLOAD_BYTES) {
      res.status(400).json({ success: false, message: "All selected files together must be 2MB or less." });
      return;
    }

    await Promise.all(files.map(assertSafeUpload));

    const result = await generateSectionsFromPDF(files.map((file) => ({ buffer: file.buffer, filename: file.originalname })));

    res.status(200).json({
      success: true,
      data: {
        sections: result.sections,
      },
    });
  } catch (error: any) {
    console.error("Section generation error:", error);
    const message = error?.message || "Failed to generate sections. Please try again.";

    if (message.includes("extract content") || message.includes("unavailable")) {
      res.status(500).json({ success: false, message });
    } else if (message.includes("couldn't be validated")) {
      res.status(422).json({ success: false, message });
    } else if (message.includes("No usable")) {
      res.status(400).json({ success: false, message });
    } else if (/(Unsupported file|invalid|between 1 byte|contains active|exceeds safe|ZIP64|readable text|could not be verified)/i.test(message)) {
      res.status(400).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message });
    }
  }
};

/**
 * POST /api/v1/admin/tests/generate-paper
 *
 * JSON body: { sections: [...], title?, instructions?, syllabus?, durationMinutes? }
 * Sends the created sections + curated subjective bank (public/*.docx) to the
 * AI, which selects bank questions per section/group. Returns the full paper.
 */
export const generatePaper = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { sections, title, instructions, syllabus, durationMinutes, subjectId, chapterId, topicId, difficulty, kind } = (req.body ?? {}) as {
      sections?: PaperSectionInput[];
      title?: unknown;
      instructions?: unknown;
      syllabus?: unknown;
      durationMinutes?: unknown;
      subjectId?: unknown; chapterId?: unknown; topicId?: unknown; difficulty?: unknown; kind?: unknown;
    };

    if (!Array.isArray(sections) || sections.length === 0) {
      res.status(400).json({ success: false, message: "At least one section is required to generate the paper." });
      return;
    }

    const result = await generateQuestionPaper({
      sections,
      title: typeof title === "string" ? title : undefined,
      instructions: typeof instructions === "string" ? instructions : undefined,
      syllabus: typeof syllabus === "string" ? syllabus : undefined,
      durationMinutes: durationMinutes != null ? Number(durationMinutes) : undefined,
      subjectId: Number(subjectId),
      chapterId: chapterId != null && chapterId !== "" ? Number(chapterId) : null,
      topicId: topicId != null && topicId !== "" ? Number(topicId) : null,
      difficulty: typeof difficulty === "string" ? difficulty as "any" | "easy" | "medium" | "hard" : "any",
      kind: typeof kind === "string" ? kind as "any" | "theory" | "numerical" : "any",
    });

    res.status(200).json({ success: true, data: { paper: result.paper } });
  } catch (error: any) {
    console.error("Paper generation error:", error);
    const message = error?.message || "Failed to generate the question paper. Please try again.";
    if (/(At least one section|at least one question|at most 100|available)/i.test(message)) {
      res.status(400).json({ success: false, message });
    } else if (/(unavailable|parsed safely)/i.test(message)) {
      res.status(500).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message });
    }
  }
};

/**
 * POST /api/v1/admin/tests/paper-download
 *
 * JSON body: { paper: {...} } — the paper returned by generate-paper.
 * Returns a printable HTML question paper as a file download.
 */
export const downloadPaper = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { paper } = (req.body ?? {}) as { paper?: unknown };
    if (!paper || typeof paper !== "object" || !Array.isArray((paper as any).sections)) {
      res.status(400).json({ success: false, message: "A generated paper is required to download." });
      return;
    }

    const html = renderPaperHtml(paper as any);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="question-paper.html"');
    res.status(200).send(html);
  } catch (error: any) {
    console.error("Paper download error:", error);
    res.status(500).json({ success: false, message: "Failed to prepare the download. Please try again." });
  }
};

/**
 * POST /api/v1/admin/tests/generate-questions
 *
 * JSON body: { numberOfQuestions, easyCount?, mediumCount?, hardCount?, syllabus?, kind? }
 * Teacher picks N subjective questions with a hardness split + topic — the AI
 * selects the perfect questions from the curated subjective bank.
 */
export const generateQuestions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { numberOfQuestions, easyCount, mediumCount, hardCount, theoryCount, numericalCount, reasoningEffort, syllabus, kind, subjectId, chapterId, topicId, chapterIds, topicIds } =
      (req.body ?? {}) as {
        numberOfQuestions?: unknown;
        easyCount?: unknown;
        mediumCount?: unknown;
        hardCount?: unknown;
        theoryCount?: unknown;
        numericalCount?: unknown;
        reasoningEffort?: unknown;
        syllabus?: unknown;
        kind?: unknown;
        subjectId?: unknown; chapterId?: unknown; topicId?: unknown; chapterIds?: unknown; topicIds?: unknown;
      };

    const result = await generateSubjectiveQuestions({
      numberOfQuestions: Number(numberOfQuestions) || 0,
      easyCount: easyCount != null ? Number(easyCount) : undefined,
      mediumCount: mediumCount != null ? Number(mediumCount) : undefined,
      hardCount: hardCount != null ? Number(hardCount) : undefined,
      theoryCount: theoryCount != null ? Number(theoryCount) : undefined,
      numericalCount: numericalCount != null ? Number(numericalCount) : undefined,
      reasoningEffort: typeof reasoningEffort === "string" ? reasoningEffort as "plus" | "pro" | "max" : undefined,
      syllabus: typeof syllabus === "string" ? syllabus : undefined,
      kind: typeof kind === "string" ? (kind as "any" | "theory" | "numerical") : undefined,
      subjectId: Number(subjectId),
      chapterId: chapterId != null && chapterId !== "" ? Number(chapterId) : null,
      topicId: topicId != null && topicId !== "" ? Number(topicId) : null,
      chapterIds: Array.isArray(chapterIds) ? chapterIds.map(Number) : undefined,
      topicIds: Array.isArray(topicIds) ? topicIds.map(Number) : undefined,
    });

    res.status(200).json({ success: true, data: { questions: result.questions } });
  } catch (error: any) {
    console.error("Question picker error:", error);
    const message = error?.message || "Failed to generate questions. Please try again.";
    if (/(must equal|must be one of|available|at least|at most|select|valid)/i.test(message)) {
      res.status(400).json({ success: false, message });
    } else if (/unavailable|parsed safely/i.test(message)) {
      res.status(500).json({ success: false, message });
    } else {
      res.status(500).json({ success: false, message });
    }
  }
};

export const questionGeneratorCatalog = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: await getQuestionGeneratorCatalog() });
  } catch (error) {
    console.error("Question generator catalog error:", error);
    res.status(500).json({ success: false, message: "Unable to load question curriculum." });
  }
};
