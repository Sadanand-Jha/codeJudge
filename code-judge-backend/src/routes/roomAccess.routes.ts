// Room join/share endpoints mounted at /api/rooms.
// Any authenticated user can create rooms and rotate passwords; other
// authenticated users join with the code + password they received.
import { Router } from "express";
import { authenticate } from "../middleware/auth.ts";
import { roomJoinRateLimit } from "../middleware/roomJoinRateLimit.ts";
import {
  roomCreateSchema,
  roomJoinSchema,
  roomPasswordResetSchema,
  roomRegistrationFormSchema,
  validate,
} from "../middleware/validate.ts";
import {
  createRoomWithCredentials,
  getEnrolledRooms,
  getRoomRegistrationForm,
  getRoomSummary,
  joinRoom,
  previewRoomJoin,
  resetRoomPassword,
  updateRoomRegistrationForm,
} from "../controllers/roomAccess.controller.ts";

const router = Router();

router.use(authenticate);

router.post("/", validate(roomCreateSchema), createRoomWithCredentials);
router.post("/join/form", roomJoinRateLimit, validate(roomJoinSchema), previewRoomJoin);
router.post("/join", roomJoinRateLimit, validate(roomJoinSchema), joinRoom);
router.get("/enrolled", getEnrolledRooms);
router.post(
  "/:code/reset-password",
  validate(roomPasswordResetSchema),
  resetRoomPassword
);
router.get("/:id/registration-form", getRoomRegistrationForm);
router.put(
  "/:id/registration-form",
  validate(roomRegistrationFormSchema),
  updateRoomRegistrationForm
);
router.get("/:id", getRoomSummary);

export default router;
