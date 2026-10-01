import path from "node:path";
import type { Request, Response } from "express";
import {
  commitSubjectiveImport,
  createSubjectiveImportPreview,
  getSubjectiveImportCatalog,
} from "../services/subjectiveQuestionImport.service.ts";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".rtf", ".pptx"]);

export async function getQuestionImportCatalog(_req: Request, res: Response) {
  try {
    res.json({ success: true, data: await getSubjectiveImportCatalog() });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Unable to load import catalog" });
  }
}

export async function previewQuestionImport(req: Request, res: Response) {
  const startedAt = Date.now();
  console.log("[question-import] preview: request received", {
    hasFile: !!req.file,
    filename: req.file?.originalname,
    mimeType: req.file?.mimetype,
    size: req.file?.size,
    body: { subjectId: req.body?.subjectId, chapterId: req.body?.chapterId, topicId: req.body?.topicId },
    userId: req.user?.userId,
  });
  try {
    const file = req.file;
    if (!file) {
      console.error("[question-import] preview: rejected — no file attached");
      return res.status(400).json({ success: false, message: "Please attach one document." });
    }
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      console.error("[question-import] preview: rejected — unsupported extension", { extension, filename: file.originalname });
      return res.status(400).json({ success: false, message: "Supported files: PDF, DOCX, TXT, MD, RTF, and PPTX." });
    }
    const subjectId = Number(req.body.subjectId);
    const chapterId = req.body.chapterId ? Number(req.body.chapterId) : null;
    const topicId = req.body.topicId ? Number(req.body.topicId) : null;
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      console.error("[question-import] preview: rejected — bad subjectId", { subjectId: req.body.subjectId });
      return res.status(400).json({ success: false, message: "Select a subject." });
    }
    const userId = Number(req.user?.userId);
    console.log("[question-import] preview: validation passed, calling service", {
      subjectId, chapterId, topicId, userId, bufferBytes: file.buffer?.length,
    });
    const result = await createSubjectiveImportPreview({
      userId,
      file: { filename: file.originalname, mimeType: file.mimetype || "application/octet-stream", buffer: file.buffer },
      scope: { subjectId, chapterId, topicId },
    });
    console.log("[question-import] preview: success", {
      batchId: result.batchId,
      questions: result.questions.length,
      elapsedMs: Date.now() - startedAt,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[question-import] preview: FAILED", {
      elapsedMs: Date.now() - startedAt,
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: unknown })?.code,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Unable to analyze this document" });
  }
}

export async function previewQuestionImportStream(req: Request, res: Response) {
  // Server-sent events: streams OpenRouter token progress to the caller, then
  // a final `done` (preview JSON) or `error` event. Same validation as preview.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  (res as { flushHeaders?: () => void }).flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const file = req.file;
    if (!file) {
      send("error", { message: "Please attach one document." });
      return res.end();
    }
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      send("error", { message: "Supported files: PDF, DOCX, TXT, MD, RTF, and PPTX." });
      return res.end();
    }
    const subjectId = Number(req.body.subjectId);
    const chapterId = req.body.chapterId ? Number(req.body.chapterId) : null;
    const topicId = req.body.topicId ? Number(req.body.topicId) : null;
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      send("error", { message: "Select a subject." });
      return res.end();
    }
    const userId = Number(req.user?.userId);
    console.log("[question-import] stream-preview: start", {
      filename: file.originalname, size: file.buffer?.length, subjectId, chapterId, topicId, userId,
    });
    const result = await createSubjectiveImportPreview({
      userId,
      file: { filename: file.originalname, mimeType: file.mimetype || "application/octet-stream", buffer: file.buffer },
      scope: { subjectId, chapterId, topicId },
    }, (chars, tail, delta) => {
      send("progress", { chars, tail, delta });
    });
    console.log("[question-import] stream-preview: done", { batchId: result.batchId, questions: result.questions.length });
    send("done", result);
    return res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze this document";
    console.error("[question-import] stream-preview: FAILED", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    send("error", { message });
    return res.end();
  }
}

export async function commitQuestionImport(req: Request, res: Response) {
  try {
    const batchId = String(req.body.batchId || "");
    if (!batchId) return res.status(400).json({ success: false, message: "Import batch is required." });
    const selectedIndexes = Array.isArray(req.body.selectedIndexes)
      ? req.body.selectedIndexes.map(Number)
      : undefined;
    const result = await commitSubjectiveImport({ userId: Number(req.user?.userId), batchId, selectedIndexes });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Question import commit failed:", error);
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Unable to import questions" });
  }
}
