// Room routes. Authenticated endpoints for creating, listing, and managing rooms
// and their members under /api/v1/user/rooms.
import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import { requirePaidPlan } from "../../middleware/requirePaidPlan.ts";
import { roomDocumentSignatureRateLimit } from "../../middleware/letterheadRateLimit.ts";
import { createRoom, listRooms, getRoom, searchUser, searchUsers, addMember, removeMember, updateMemberStatus, updateRoom, getRoomsForStudent } from "../../controllers/room.controller.ts";
import {
  createMyRoomDocument,
  deleteMyRoomDocument,
  downloadMyRoomDocument,
  getRoomDocumentUploadSignature,
  listMyRoomDocuments,
  previewMyRoomDocument,
} from "../../controllers/roomDocument.controller.ts";
import {
  createMyRoomAnnouncement,
  deleteMyRoomAnnouncement,
  listMyRoomAnnouncements,
  updateMyRoomAnnouncement,
} from "../../controllers/roomAnnouncement.controller.ts";

const router = Router();

// All routes require auth
router.use(authenticate);

// Search must be before :roomId param
router.get("/search/user", searchUser);
router.get("/search/users", searchUsers);
router.get("/by-student/:username", getRoomsForStudent);

// Alias for frontend: GET /my-rooms should return owned rooms (same as GET /)
router.get("/my-rooms", listRooms);

router.post("/", requirePaidPlan, createRoom);
router.get("/", listRooms);

// Room documents. Only the room owner can upload or delete; owners and members
// can list and download.
router.post(
  "/:roomId/documents/upload-signature",
  roomDocumentSignatureRateLimit,
  getRoomDocumentUploadSignature
);
router.get("/:roomId/documents", listMyRoomDocuments);
router.post("/:roomId/documents", createMyRoomDocument);
router.get("/:roomId/documents/:documentId/download", downloadMyRoomDocument);
router.get("/:roomId/documents/:documentId/preview", previewMyRoomDocument);
router.delete("/:roomId/documents/:documentId", deleteMyRoomDocument);

// Room announcements. Only the owner writes; owners and members read.
router.get("/:roomId/announcements", listMyRoomAnnouncements);
router.post("/:roomId/announcements", createMyRoomAnnouncement);
router.patch("/:roomId/announcements/:announcementId", updateMyRoomAnnouncement);
router.delete("/:roomId/announcements/:announcementId", deleteMyRoomAnnouncement);

router.get("/:roomId", getRoom);
router.post("/:roomId/members", addMember);
router.delete("/:roomId/members/:userId", removeMember);
router.patch("/:roomId/members/:userId", updateMemberStatus);
router.patch("/:roomId", updateRoom);

export default router;
