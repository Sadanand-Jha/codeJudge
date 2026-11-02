import type { Request, Response } from "express";
import {
  getQuizAttemptDetail,
  listQuizAttempts,
  listQuizOptions,
  updateQuizAttemptResponses,
} from "../services/platformQuizResponses.service.ts";
import { recalculateQuizAttempt } from "../services/quizSubmission.service.ts";

/**
 * Owner-only student-response console handlers for /api/v1/platform.
 * Mounted behind requireOwner.
 */

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function handleError(res: Response, error: unknown, fallback: string) {
  const statusCode = (error as { statusCode?: number })?.statusCode ?? 500;
  const message = error instanceof Error ? error.message : fallback;
  if (statusCode >= 500) console.error(`[platform] ${fallback}`, error);
  return res.status(statusCode).json({ success: false, message: statusCode >= 500 ? fallback : message });
}

export async function getQuizOptions(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : null;
    const quizzes = await listQuizOptions(search);
    return res.json({ success: true, data: { quizzes } });
  } catch (error) {
    return handleError(res, error, "Unable to load quizzes.");
  }
}

export async function getQuizAttempts(req: Request, res: Response) {
  try {
    const quizId = positiveInt(req.params.quizId);
    if (!quizId) {
      return res.status(400).json({ success: false, message: "A valid quiz id is required." });
    }
    const search = typeof req.query.search === "string" ? req.query.search : null;
    const data = await listQuizAttempts(quizId, search);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Unable to load quiz responses.");
  }
}

export async function getAttemptResponses(req: Request, res: Response) {
  try {
    const quizId = positiveInt(req.params.quizId);
    const attemptId = positiveInt(req.params.attemptId);
    if (!quizId || !attemptId) {
      return res.status(400).json({ success: false, message: "Valid quiz and attempt ids are required." });
    }
    const data = await getQuizAttemptDetail(quizId, attemptId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Unable to load student responses.");
  }
}

export async function updateAttemptResponses(req: Request, res: Response) {
  try {
    const quizId = positiveInt(req.params.quizId);
    const attemptId = positiveInt(req.params.attemptId);
    if (!quizId || !attemptId) {
      return res.status(400).json({ success: false, message: "Valid quiz and attempt ids are required." });
    }

    const responses = (req.body ?? {}).responses;
    const updated = await updateQuizAttemptResponses(quizId, attemptId, responses);
    const attempt = await recalculateQuizAttempt(quizId, attemptId);

    return res.json({ success: true, data: { updated, attempt } });
  } catch (error) {
    return handleError(res, error, "Unable to update student responses.");
  }
}
