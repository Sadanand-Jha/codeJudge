// Editor routes. Authenticated POST /api/v1/user/editor/run endpoint for executing
// code via Judge0.
import { Router } from "express";
import { runCode } from "../../../controllers/run.controller.ts";
import { authenticate } from "../../../middleware/auth.ts";

const router = Router();

router.post("/run", authenticate, runCode);

export default router;
