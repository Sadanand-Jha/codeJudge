"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_ts_1 = require("./v1/index.ts");
var problem_routes_ts_1 = require("./problem.routes.ts");
var router = (0, express_1.Router)();
router.use("/v1", index_ts_1.default);
// Public problem routes — GET /api/problems and GET /api/problems/:problemId
router.use("/problems", problem_routes_ts_1.default);
exports.default = router;
