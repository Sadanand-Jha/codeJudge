import path from "node:path";
import type { Request, Response } from "express";
import {
  commitSyllabusImport,
  createSyllabusImportPreview,
} from "../services/syllabusImport.service.ts";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".rtf"]);

function validateUpload(req: Request): { filename: string; mimeType: string; buffer: Buffer; userId: number } {
  const file = req.file;
  if (!file) throw new Error("Please attach one syllabus document.");
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Supported files: PDF, DOCX, TXT, MD, and RTF.");
  }
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Owner session is missing or invalid.");
  }
  return {
    filename: file.originalname,
    mimeType: file.mimetype || "application/octet-stream",
    buffer: file.buffer,
    userId,
  };
}

export async function previewSyllabusImport(req: Request, res: Response) {
  const startedAt = Date.now();
  try {
    const file = validateUpload(req);
    console.log("[syllabus-import] preview: request", {
      filename: file.filename,
      mimeType: file.mimeType,
      bytes: file.buffer.length,
      userId: file.userId,
    });
    const result = await createSyllabusImportPreview({ userId: file.userId, file });
    console.log("[syllabus-import] preview: success", {
      batchId: result.batchId,
      subjects: result.summary.subjects.total,
      chapters: result.summary.chapters.total,
      topics: result.summary.topics.total,
      newRecords: result.summary.totalNew,
      elapsedMs: Date.now() - startedAt,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyse this syllabus document.";
    console.error("[syllabus-import] preview: FAILED", {
      message,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(400).json({ success: false, message });
  }
}

export async function previewSyllabusImportStream(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  (res as { flushHeaders?: () => void }).flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const file = validateUpload(req);
    console.log("[syllabus-import] stream-preview: start", {
      filename: file.filename,
      bytes: file.buffer.length,
      userId: file.userId,
    });
    const result = await createSyllabusImportPreview(
      { userId: file.userId, file },
      (chars, tail, delta) => send("progress", { chars, tail, delta })
    );
    console.log("[syllabus-import] stream-preview: done", {
      batchId: result.batchId,
      newRecords: result.summary.totalNew,
    });
    send("done", result);
    return res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyse this syllabus document.";
    console.error("[syllabus-import] stream-preview: FAILED", { message });
    send("error", { message });
    return res.end();
  }
}

export async function commitSyllabusImportHandler(req: Request, res: Response) {
  const startedAt = Date.now();
  const batchId = typeof req.body?.batchId === "string" ? req.body.batchId.trim() : "";
  try {
    if (!batchId) {
      return res.status(400).json({ success: false, message: "Syllabus preview is required." });
    }
    const userId = Number(req.user?.userId);
    const result = await commitSyllabusImport({ userId, batchId });
    console.log("[syllabus-import] commit: success", {
      batchId,
      ...result,
      elapsedMs: Date.now() - startedAt,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the syllabus hierarchy.";
    console.error("[syllabus-import] commit: FAILED", {
      batchId: batchId || "(missing)",
      message,
      elapsedMs: Date.now() - startedAt,
    });
    return res.status(400).json({ success: false, message });
  }
}
