/**
 * ================================================================
 * Problem Routes
 * ================================================================
 * 
 * FLOW:
 *   
 *   Frontend calls          Backend routes          Controller
 *   ─────────────────────────────────────────────────────────────
 *   GET /api/problems       → router.get("/")       → getAllProblems
 *   GET /api/problems/4A    → router.get("/:id")    → getProblemByProblemId
 * 
 * These are PUBLIC routes (no auth middleware).
 * 
 * RESPONSE FORMAT (both endpoints):
 *   Success: { success: true, data: ... }
 *   Error:   { success: false, message: "..." }
 * 
 * ================================================================
 */

import { Router } from "express";
import {
  getAllProblems,
  getProblemByProblemId,
} from "../controllers/problem.controller.ts";

const router = Router();

// GET /api/problems — return all problems (lightweight)
router.get("/", getAllProblems);

// GET /api/problems/:problemId — return full problem detail
router.get("/:problemId", getProblemByProblemId);

export default router;