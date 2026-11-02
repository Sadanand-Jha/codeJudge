import type { Request, Response } from "express";
import {
  RoomAnnouncementError,
  createRoomAnnouncement,
  deleteRoomAnnouncement,
  listRoomAnnouncements,
  updateRoomAnnouncement,
} from "../services/roomAnnouncement.service.ts";

function userIdFrom(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new RoomAnnouncementError(401, "AUTH_REQUIRED", "Authentication required.");
  }
  return userId;
}

function sendError(res: Response, error: unknown) {
  if (error instanceof RoomAnnouncementError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }
  console.error("Room announcement request failed:", error);
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
  });
}

/** GET /api/v1/user/rooms/:roomId/announcements */
export async function listMyRoomAnnouncements(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const announcements = await listRoomAnnouncements(req.params.roomId, userId);
    res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    sendError(res, error);
  }
}

/** POST /api/v1/user/rooms/:roomId/announcements */
export async function createMyRoomAnnouncement(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const announcement = await createRoomAnnouncement(req.params.roomId, userId, {
      title: body.title,
      body: body.body,
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    sendError(res, error);
  }
}

/** PATCH /api/v1/user/rooms/:roomId/announcements/:announcementId */
export async function updateMyRoomAnnouncement(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const announcement = await updateRoomAnnouncement(
      req.params.roomId,
      req.params.announcementId,
      userId,
      { title: body.title, body: body.body }
    );
    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    sendError(res, error);
  }
}

/** DELETE /api/v1/user/rooms/:roomId/announcements/:announcementId */
export async function deleteMyRoomAnnouncement(req: Request, res: Response) {
  try {
    const userId = userIdFrom(req);
    const result = await deleteRoomAnnouncement(
      req.params.roomId,
      req.params.announcementId,
      userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
}
