import type { Request, Response } from "express";
import { AdminQuizService } from "../services/database/adminQuiz.service.ts";
import { QuizService } from "../services/database/quiz.service.ts";
import {
  QuizCryptoInputError,
  QuizCryptoService,
  QuizEncryptedError,
  QuizNotFoundError,
} from "../services/quizCrypto.service.ts";
import type {
  Envelope,
  KekConfig,
  SecureQuizContentInput,
} from "../repositories/quizCrypto.repository.ts";

const adminQuizService = new AdminQuizService();
const quizService = new QuizService();
const quizCryptoService = new QuizCryptoService();

const NO_STORE = "no-store, no-cache, must-revalidate, private";

function getUserId(req: Request): number | null {
  const userId = Number(req.user?.userId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function parseQuizId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function envelope(value: unknown): Envelope | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.v !== 1 || row.alg !== "A256GCM") return null;
  if (typeof row.iv !== "string" || typeof row.ct !== "string") return null;
  return { v: 1, alg: "A256GCM", iv: row.iv, ct: row.ct };
}

function toKekResponse(config: KekConfig | null) {
  if (!config) return { configured: false };
  return {
    configured: true,
    salt: config.salt,
    kdf: config.kdf,
    check: envelope(config.check),
  };
}

export const getKekConfigController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const config = await quizCryptoService.getKekConfig(userId);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: toKekResponse(config) });
  } catch (error) {
    console.error("Error fetching quiz KEK config:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching the encryption key setup",
    });
  }
};

export const saveKekConfigController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const existing = await quizCryptoService.getKekConfig(userId);
    if (existing) {
      res.status(409).json({
        success: false,
        message:
          "A quiz encryption key is already configured for this account. It cannot be replaced because existing quizzes are encrypted with it.",
      });
      return;
    }
    const body = req.body as KekConfig;
    const config = await quizCryptoService.saveKekConfig(userId, {
      salt: body.salt,
      kdf: body.kdf,
      check: body.check,
    });
    res.set("Cache-Control", NO_STORE);
    res.status(201).json({ success: true, data: toKekResponse(config) });
  } catch (error) {
    console.error("Error saving quiz KEK config:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving the encryption key setup",
    });
  }
};

type OwnerResult =
  | { ok: true; userId: number; quizId: number }
  | { ok: false; status: number; message: string };

async function requireQuizOwner(req: Request): Promise<OwnerResult> {
  const userId = getUserId(req);
  if (!userId) {
    return { ok: false, status: 401, message: "Unauthorized access" };
  }
  const quizId = parseQuizId(req.params.quizId);
  if (!quizId) {
    return { ok: false, status: 400, message: "Invalid quiz id" };
  }
  const quiz = await adminQuizService.getQuizById(String(quizId));
  if (!quiz) {
    return { ok: false, status: 404, message: "Quiz not found" };
  }
  if (Number(quiz.createdby) !== userId) {
    return {
      ok: false,
      status: 403,
      message: "You can only access your own quiz",
    };
  }
  return { ok: true, userId, quizId };
}

export const getTeacherSecureContentController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const content = await quizCryptoService.getTeacherContent(owner.quizId);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    if (error instanceof QuizNotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    console.error("Error fetching encrypted quiz content:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching encrypted quiz content",
    });
  }
};

export const saveTeacherSecureContentController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const body = req.body as SecureQuizContentInput;
    const saved = await quizCryptoService.saveTeacherContent(
      owner.quizId,
      owner.userId,
      body
    );
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    if (error instanceof QuizNotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof QuizCryptoInputError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof QuizEncryptedError) {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message === "Question does not belong to this quiz"
    ) {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    // Never log the request body: it contains ciphertext and is intentionally
    // unreadable by the server.
    console.error("Error saving encrypted quiz content:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving encrypted quiz content",
    });
  }
};

export const getStudentSecureContentController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const quizId = parseQuizId(req.params.quizId);
    if (!quizId) {
      res.status(400).json({ success: false, message: "Invalid quiz id" });
      return;
    }
    const quiz = await quizService.getQuizById(String(quizId));
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    if (Number(quiz.createdby) !== userId) {
      const access = await quizService.checkQuizAccess(userId, quizId);
      if (!access.allowed) {
        const completed = await quizService.hasCompletedAttempt(userId, quizId);
        if (!completed) {
          res.status(403).json({
            success: false,
            message: access.reason || "You are not allowed to access this quiz",
          });
          return;
        }
      }
    }
    const content = await quizCryptoService.getStudentContent(quizId);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    if (error instanceof QuizNotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    console.error("Error fetching student encrypted quiz content:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching encrypted quiz content",
    });
  }
};
