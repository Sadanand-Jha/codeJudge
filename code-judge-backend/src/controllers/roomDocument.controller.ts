import type { Request, Response } from "express";
import {
  RoomDocumentError,
  buildRoomDocumentUploadSignature,
  createRoomDocument,
  deleteRoomDocument,
  downloadRoomDocument,
  listRoomDocuments,
} from "../services/roomDocument.service.ts";

function userIdFrom(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new RoomDocumentError(401, "AUTH_REQUIRED", "Authentication required.");
  }
  return userId;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof RoomDocumentError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.upgradeUrl ? { upgradeUrl: error.upgradeUrl } : {}),
    });
    return;
  }
  console.error("Room document request failed:", error);
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  });
}

function contentDisposition(filename: string, inline: boolean): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** POST /api/v1/user/rooms/:roomId/documents/upload-signature */
export async function getRoomDocumentUploadSignature(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const data = await buildRoomDocumentUploadSignature(req.params.roomId, userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
}

/** GET /api/v1/user/rooms/:roomId/documents */
export async function listMyRoomDocuments(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const documents = await listRoomDocuments(req.params.roomId, userId);
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    sendError(res, error);
  }
}

/** POST /api/v1/user/rooms/:roomId/documents */
export async function createMyRoomDocument(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const document = await createRoomDocument(req.params.roomId, userId, {
      publicId: body.publicId,
      version: body.version,
      signature: body.signature,
      originalFilename: body.originalFilename,
    });
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    sendError(res, error);
  }
}

/** DELETE /api/v1/user/rooms/:roomId/documents/:documentId */
export async function deleteMyRoomDocument(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const result = await deleteRoomDocument(
      req.params.roomId,
      req.params.documentId,
      userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
}

/** GET /api/v1/user/rooms/:roomId/documents/:documentId/download */
export async function downloadMyRoomDocument(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const file = await downloadRoomDocument(
      req.params.roomId,
      req.params.documentId,
      userId
    );
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", contentDisposition(file.filename, false));
    res.setHeader("Content-Length", String(file.buffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(file.buffer);
  } catch (error) {
    sendError(res, error);
  }
}

/** GET /api/v1/user/rooms/:roomId/documents/:documentId/preview */
export async function previewMyRoomDocument(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const file = await downloadRoomDocument(
      req.params.roomId,
      req.params.documentId,
      userId
    );
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", contentDisposition(file.filename, true));
    res.setHeader("Content-Length", String(file.buffer.length));
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).send(file.buffer);
  } catch (error) {
    sendError(res, error);
  }
}
