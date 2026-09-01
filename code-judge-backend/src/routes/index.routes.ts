/**
 * ================================================================
 * API Routes - Entry Point
 * ================================================================
 * 
 * Mounted at: /api  (see app.ts: app.use("/api", apiRoutes))
 * 
 * Route Map:
 *   
 *   /api
 *   ├── /problems          → problem.routes.ts  (public)
 *   │   ├── GET /          → getAllProblems     → ProblemListItem[]
 *   │   └── GET /:problemId → getProblemByProblemId → ProblemDetail
 *   │
 *   └── /v1                → v1/index.ts        (namespaced)
 *       ├── /admin         → admin routes
 *       └── /user          → user routes
 *           └── /editor    → editor.routes.ts
 *               └── POST /run → runCode (Judge0)
 * 
 * ================================================================
 */

import { Router } from "express";
import v1Routes from "./v1/index.ts";
import problemRoutes from "./problem.routes.ts";
import authRoutes from "./auth.routes.ts"
import { authenticate } from "../middleware/auth.ts";
import { validate, quizGameConfigSchema } from "../middleware/validate.ts";
import { getQuizGameConfig, upsertQuizGameConfig } from "../controllers/quiz.controller.ts";

const router = Router();

router.use("/v1", v1Routes);
router.use("/auth", authRoutes)

// Alias for spec-required path: GET/PUT /api/quizzes/:quizId/game-config
// Mirrors /api/v1/user/quiz/:quizId/game-config so task's Curl examples work.
// Auth + validation identical to the v1 route.
router.get("/quizzes/:quizId/game-config", authenticate, getQuizGameConfig);
router.put("/quizzes/:quizId/game-config", authenticate, validate(quizGameConfigSchema), upsertQuizGameConfig);

// Public problem routes — GET /api/problems and GET /api/problems/:problemId
router.use("/problems", problemRoutes);

export default router;