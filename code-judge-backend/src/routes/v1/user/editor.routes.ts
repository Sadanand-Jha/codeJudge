import { Router } from "express";
import { runCode } from "../../../controllers/run.controller.ts";

const router = Router();

router.post("/run", runCode);

export default router;