import type { Request, Response } from "express";
import {
  deleteSavedTestPaper,
  getSavedTestPaper,
  listSavedTestPapers,
  saveTestPaper,
} from "../services/savedTestPaper.service.js";

const authenticatedUserId = (req: Request): number => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Unauthorized");
  return userId;
};

const paperId = (req: Request): number => {
  const id = Number(req.params.paperId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Saved test was not found.");
  return id;
};

export const getSavedTests = async (req: Request, res: Response) => {
  try {
    const tests = await listSavedTestPapers(authenticatedUserId(req));
    res.status(200).json({ success: true, data: { tests } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved tests.";
    res.status(message === "Unauthorized" ? 401 : 500).json({ success: false, message });
  }
};

export const getSavedTest = async (req: Request, res: Response) => {
  try {
    const test = await getSavedTestPaper(authenticatedUserId(req), paperId(req));
    res.status(200).json({ success: true, data: { test } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the saved test.";
    res.status(message === "Unauthorized" ? 401 : /not found/i.test(message) ? 404 : 500).json({ success: false, message });
  }
};

export const saveTest = async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const test = await saveTestPaper(authenticatedUserId(req), {
      draftId: String(body.draftId ?? ""),
      title: String(body.title ?? ""),
      creationType: typeof body.creationType === "string" ? body.creationType : undefined,
      durationMinutes: body.durationMinutes as number | undefined,
      subjects: body.subjects,
      sectionsCount: body.sectionsCount as number | undefined,
      totalQuestions: body.totalQuestions as number | undefined,
      totalMarks: body.totalMarks as number | undefined,
      meta: body.meta,
      paper: body.paper,
    });
    res.status(201).json({ success: true, data: { test } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the test.";
    const isValidation = /required|invalid|must|too large|not found|at least one/i.test(message);
    res.status(message === "Unauthorized" ? 401 : isValidation ? 400 : 500).json({ success: false, message });
  }
};

export const removeSavedTest = async (req: Request, res: Response) => {
  try {
    await deleteSavedTestPaper(authenticatedUserId(req), paperId(req));
    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete the saved test.";
    res.status(message === "Unauthorized" ? 401 : /not found/i.test(message) ? 404 : 500).json({ success: false, message });
  }
};
