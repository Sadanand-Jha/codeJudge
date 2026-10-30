import type { Request, Response } from "express";
import {
  LetterheadError,
  assertCanCreateLetterhead,
  canUseCustomHeader,
  createLetterhead,
  deleteLetterhead,
  getLetterheadUsage,
  listLetterheads,
  requireCustomHeaderAccess,
  updateLetterhead,
} from "../services/letterhead.service.ts";
import { buildUploadSignature } from "../services/letterhead.service.ts";

function userIdFrom(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new LetterheadError(401, "AUTH_REQUIRED", "Authentication required.");
  return userId;
}

function letterheadIdFrom(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new LetterheadError(400, "INVALID_ID", "Invalid letterhead id.");
  }
  return id;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof LetterheadError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.upgradeUrl ? { upgradeUrl: error.upgradeUrl } : {}),
    });
    return;
  }
  console.error("Letterhead request failed:", error);
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  });
}

/** POST /api/uploads/cloudinary/signature — short-lived, per-user upload signature. */
export async function getLetterheadUploadSignature(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    await requireCustomHeaderAccess(userId);
    await assertCanCreateLetterhead(userId);
    const data = buildUploadSignature(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
}

/** GET /api/letterheads — includes locked records for Basic users. */
export async function listMyLetterheads(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const unlocked = await canUseCustomHeader(userId);
    const letterheads = await listLetterheads(userId, { locked: !unlocked });
    const usage = await getLetterheadUsage(userId);
    res.status(200).json({ success: true, data: { letterheads, usage } });
  } catch (error) {
    sendError(res, error);
  }
}

/** POST /api/letterheads — persist verified Cloudinary metadata for an upload. */
export async function createMyLetterhead(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    await requireCustomHeaderAccess(userId);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const letterhead = await createLetterhead(userId, {
      name: body.name,
      publicId: body.publicId,
      version: body.version,
      signature: body.signature,
      headerConfig: body.headerConfig as never,
    });
    res.status(201).json({ success: true, data: { letterhead } });
  } catch (error) {
    sendError(res, error);
  }
}

/** PATCH /api/letterheads/:id — rename, place or make default. */
export async function updateMyLetterhead(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    await requireCustomHeaderAccess(userId);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const letterhead = await updateLetterhead(userId, letterheadIdFrom(req), {
      name: body.name,
      headerConfig: body.headerConfig as never,
      isDefault: body.isDefault,
    });
    res.status(200).json({ success: true, data: { letterhead } });
  } catch (error) {
    sendError(res, error);
  }
}

/** DELETE /api/letterheads/:id — removes the Cloudinary asset and DB row. */
export async function deleteMyLetterhead(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    await requireCustomHeaderAccess(userId);
    const result = await deleteLetterhead(userId, letterheadIdFrom(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
}
