// End-to-end encrypted quiz payloads.
//
// These handlers only ever see ciphertext and a wrapped data key. The
// teacher's key is generated, used, and stored in the browser/PDF only.
import type { NextFunction, Request, Response } from "express";
import { AdminQuizService } from "../services/database/adminQuiz.service.ts";
import { QuizService } from "../services/database/quiz.service.ts";
import { SecureQuizService } from "../services/secureQuiz.service.ts";
import type {
  EncryptedBlobRow,
  SecureQuizPayloadInput,
} from "../repositories/secureQuiz.repository.ts";

const adminQuizService = new AdminQuizService();
const quizService = new QuizService();
const secureQuizService = new SecureQuizService();

interface SecureQuizPayloadBody {
  quizId: string;
  version: number;
  algorithm?: string;
  questions: EncryptedBlobRow;
  problemHtml: EncryptedBlobRow;
  wrappedKey: EncryptedBlobRow;
  keyFingerprint: string;
  createdAt?: string;
}

const NO_STORE = "no-store, no-cache, must-revalidate, private";

export function secureQuizNoStore(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.set("Cache-Control", NO_STORE);
  next();
}

function getUserId(req: Request): number | null {
  const userId = Number(req.user?.userId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function parseQuizId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type OwnerResult =
  | { ok: true; userId: number; quizId: number; quiz: any }
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
    return { ok: false, status: 403, message: "You can only access your own quiz" };
  }
  return { ok: true, userId, quizId, quiz };
}

function toMeta(exists: boolean, row?: any) {
  if (!exists || !row) return { exists: false };
  return {
    exists: true,
    quizId: row.quizId,
    payloadId: row.payloadId,
    version: row.version,
    algorithm: row.algorithm,
    keyFingerprint: row.keyFingerprint,
    stale: Boolean(row.stale),
    staleAt: row.staleAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const getSecureQuizMetaController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const meta = await secureQuizService.getMeta(owner.quizId);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: toMeta(Boolean(meta), meta) });
  } catch (error) {
    console.error("Error fetching secure quiz metadata:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching encrypted quiz metadata",
    });
  }
};

export const getSecureQuizPayloadController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const row = await secureQuizService.get(owner.quizId);
    if (!row) {
      res.status(404).json({
        success: false,
        message: "No encrypted copy exists for this quiz",
      });
      return;
    }
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error("Error fetching encrypted quiz payload:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching the encrypted quiz",
    });
  }
};

export const saveSecureQuizPayloadController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }

    const body = req.body as SecureQuizPayloadBody;
    if (body.quizId !== String(owner.quizId)) {
      res.status(400).json({
        success: false,
        message: "Encrypted payload does not match this quiz",
      });
      return;
    }
    const input: SecureQuizPayloadInput = {
      payloadId: body.quizId,
      version: body.version,
      algorithm: body.algorithm ?? "AES-256-GCM",
      questions: body.questions,
      problemHtml: body.problemHtml,
      wrappedKey: body.wrappedKey,
      keyFingerprint: body.keyFingerprint,
    };

    const saved = await secureQuizService.save(owner.quizId, owner.userId, input);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: toMeta(true, saved) });
  } catch (error) {
    // Never log the request body: it contains encrypted content and the
    // wrapped key. Only the error itself is safe to record.
    console.error("Error saving encrypted quiz payload:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving the encrypted quiz",
    });
  }
};

/**
 * Clear the stale marker after the studio's own plaintext question sync. The
 * encrypted copy was uploaded earlier in the same save, so marking it current
 * here keeps the next save from prompting for an unnecessary new key.
 */
export const ackSecureQuizPayloadController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const row = await secureQuizService.markFresh(owner.quizId);
    if (!row) {
      res.status(404).json({
        success: false,
        message: "No encrypted copy exists for this quiz",
      });
      return;
    }
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: toMeta(true, row) });
  } catch (error) {
    console.error("Error refreshing encrypted quiz metadata:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while refreshing the encrypted quiz",
    });
  }
};

export const deleteSecureQuizPayloadController = async (
  req: Request,
  res: Response
) => {
  try {
    const owner = await requireQuizOwner(req);
    if (!owner.ok) {
      res.status(owner.status).json({ success: false, message: owner.message });
      return;
    }
    const deleted = await secureQuizService.remove(owner.quizId);
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: { deleted } });
  } catch (error) {
    console.error("Error deleting encrypted quiz payload:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting the encrypted quiz",
    });
  }
};

/**
 * Student/participant access to the ciphertext. The payload is useless
 * without the teacher's key, so this only exposes opaque blobs to signed-in
 * users and refuses drafts.
 */
export const getStudentSecureQuizPayloadController = async (
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
    const status = String(quiz.status ?? "").trim().toLowerCase();
    if (!status || status === "draft") {
      res.status(403).json({
        success: false,
        message: "This quiz has not been published yet",
      });
      return;
    }
    const row = await secureQuizService.get(quizId);
    if (!row) {
      res.status(404).json({
        success: false,
        message: "No encrypted copy exists for this quiz",
      });
      return;
    }
    res.set("Cache-Control", NO_STORE);
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error("Error fetching public encrypted quiz payload:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching the encrypted quiz",
    });
  }
};
