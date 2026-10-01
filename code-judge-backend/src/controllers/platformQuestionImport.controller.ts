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
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "Please attach one document." });
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return res.status(400).json({ success: false, message: "Supported files: PDF, DOCX, TXT, MD, RTF, and PPTX." });
    }
    const subjectId = Number(req.body.subjectId);
    const chapterId = req.body.chapterId ? Number(req.body.chapterId) : null;
    const topicId = req.body.topicId ? Number(req.body.topicId) : null;
    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      return res.status(400).json({ success: false, message: "Select a subject." });
    }
    const userId = Number(req.user?.userId);
    const result = await createSubjectiveImportPreview({
      userId,
      file: { filename: file.originalname, mimeType: file.mimetype || "application/octet-stream", buffer: file.buffer },
      scope: { subjectId, chapterId, topicId },
      maxQuestions: Math.min(100, Math.max(1, Number(req.body.maxQuestions) || 50)),
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Question import preview failed:", error);
    return res.status(400).json({ success: false, message: error instanceof Error ? error.message : "Unable to analyze this document" });
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
