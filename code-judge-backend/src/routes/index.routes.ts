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

const router = Router();

router.use("/v1", v1Routes);

// Public problem routes — GET /api/problems and GET /api/problems/:problemId
router.use("/problems", problemRoutes);

export default router;