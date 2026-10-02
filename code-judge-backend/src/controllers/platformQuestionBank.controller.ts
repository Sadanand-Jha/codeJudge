import type { Request, Response } from "express";
import { deleteBankQuestion, listBankQuestions } from "../services/questionBankAdmin.service.ts";

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