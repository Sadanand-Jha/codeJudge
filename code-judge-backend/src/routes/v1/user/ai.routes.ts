import { Router } from "express";
import { chat } from "../../../controllers/ai.controller.ts";

const router = Router();

router.post("/chat", chat);

export default router;