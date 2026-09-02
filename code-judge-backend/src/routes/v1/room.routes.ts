// Room routes. Authenticated endpoints for creating, listing, and managing rooms
// and their members under /api/v1/user/rooms.
import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import { createRoom, listRooms, getRoom, searchUser, searchUsers, addMember, removeMember, updateMemberStatus, updateRoom, getRoomsForStudent } from "../../controllers/room.controller.ts";

const router = Router();

// All routes require auth
router.use(authenticate);

// Search must be before :roomId param
router.get("/search/user", searchUser);
router.get("/search/users", searchUsers);
router.get("/by-student/:username", getRoomsForStudent);

// Alias for frontend: GET /my-rooms should return owned rooms (same as GET /)
router.get("/my-rooms", listRooms);

router.post("/", createRoom);
router.get("/", listRooms);
router.get("/:roomId", getRoom);
router.post("/:roomId/members", addMember);
router.delete("/:roomId/members/:userId", removeMember);
router.patch("/:roomId/members/:userId", updateMemberStatus);
router.patch("/:roomId", updateRoom);

export default router;
