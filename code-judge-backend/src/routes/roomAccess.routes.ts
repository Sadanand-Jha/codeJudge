// Room join/share endpoints mounted at /api/rooms.
// Teachers create rooms and rotate passwords; authenticated users join with
// the code + password they received from their teacher.
import { Router } from "express";
import { authenticate } from "../middleware/auth.ts";
import { requireTeacher } from "../middleware/requireTeacher.ts";
import { roomJoinRateLimit } from "../middleware/roomJoinRateLimit.ts";
import {
  roomCreateSchema,
  roomJoinSchema,
  roomRegistrationFormSchema,
  validate,
} from "../middleware/validate.ts";
import {
  createRoomWithCredentials,
  getRoomRegistrationForm,
  getRoomSummary,
  joinRoom,
  previewRoomJoin,
  resetRoomPassword,
  updateRoomRegistrationForm,
} from "../controllers/roomAccess.controller.ts";

const router = Router();

router.use(authenticate);

router.post("/", requireTeacher, validate(roomCreateSchema), createRoomWithCredentials);
router.post("/join/form", roomJoinRateLimit, validate(roomJoinSchema), previewRoomJoin);
router.post("/join", roomJoinRateLimit, validate(roomJoinSchema), joinRoom);
router.post("/:code/reset-password", requireTeacher, resetRoomPassword);
router.get("/:id/registration-form", getRoomRegistrationForm);
router.put(
  "/:id/registration-form",
  requireTeacher,
  validate(roomRegistrationFormSchema),
  updateRoomRegistrationForm
);
router.get("/:id", getRoomSummary);

export default router;
