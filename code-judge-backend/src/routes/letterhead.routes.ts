import { Router } from "express";
import { authenticate } from "../middleware/auth.ts";
import {
  createMyLetterhead,
  deleteMyLetterhead,
  listMyLetterheads,
  updateMyLetterhead,
} from "../controllers/letterhead.controller.ts";

const router = Router();

router.use(authenticate);
router.get("/", listMyLetterheads);
router.post("/", createMyLetterhead);
router.patch("/:id", updateMyLetterhead);
router.delete("/:id", deleteMyLetterhead);

export default router;
