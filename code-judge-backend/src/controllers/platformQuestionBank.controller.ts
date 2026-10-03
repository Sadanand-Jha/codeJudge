import type { Request, Response } from "express";
import { deleteBankQuestion, listBankQuestions, updateBankQuestion } from "../services/questionBankAdmin.service.ts";

/**
 * Owner-only read/delete handlers for the curated subjective question bank.
 * Mounted under /api/v1/platform and gated by requireOwner.
 */

function optionalInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function getBankQuestions(req: Request, res: Response) {
  try {
    const result = await listBankQuestions({
      subjectId: optionalInt(req.query.subjectId),
      chapterId: optionalInt(req.query.chapterId),
      topicId: optionalInt(req.query.topicId),
      difficultyId: optionalInt(req.query.difficultyId),
      search: typeof req.query.search === "string" ? req.query.search.trim().slice(0, 200) : null,
      page: optionalInt(req.query.page) ?? 1,
      limit: optionalInt(req.query.limit) ?? 50,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[platform] question bank list failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load the question bank." });
  }
}

export async function updateBankQuestionHandler(req: Request, res: Response) {
  try {
    const id = optionalInt(req.params.questionId);
    if (!id) {
      return res.status(400).json({ success: false, message: "A valid question id is required." });
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const toOptionalInt = (value: unknown): number | null | undefined => {
      if (value === undefined) return undefined;
      if (value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    };
    const questionText = typeof body.questionText === "string" ? body.questionText : typeof body.question_text === "string" ? body.question_text : "";
    const questionHtml = typeof body.questionHtml === "string" ? body.questionHtml : typeof body.question_html === "string" ? body.question_html : null;
    const updated = await updateBankQuestion(id, {
      questionText,
      questionHtml,
      difficultyId: toOptionalInt(body.difficultyId ?? body.difficulty_id) ?? undefined,
      categoryId: toOptionalInt(body.categoryId ?? body.category_id) ?? undefined,
      subjectId: toOptionalInt(body.subjectId ?? body.subject_id) ?? undefined,
      chapterId: toOptionalInt(body.chapterId ?? body.chapter_id),
      topicId: toOptionalInt(body.topicId ?? body.topic_id),
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
    const message = error instanceof Error ? error.message : "Unable to update this question.";
    // Validation/lookup failures (bad scope, unknown difficulty/category) surface here.
    if (statusCode !== 500) return res.status(statusCode).json({ success: false, message });
    console.error("[platform] question update failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update this question." });
  }
}

export async function removeBankQuestion(req: Request, res: Response) {
  try {
    const id = optionalInt(req.params.questionId);
    if (!id) {
      return res.status(400).json({ success: false, message: "A valid question id is required." });
    }
    const deleted = await deleteBankQuestion(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }
    return res.json({ success: true, data: { deleted: 1, id } });
  } catch (error) {
    console.error("[platform] question delete failed:", error);
    return res.status(500).json({ success: false, message: "Unable to delete this question." });
  }
}