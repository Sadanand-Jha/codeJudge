import { Router } from "express";
import { runCode } from "../../../controllers/run.controller.ts";
import { authenticate } from "../../../middleware/auth.ts";

const router = Router();

router.post("/run", authenticate, runCode);

export default router;
