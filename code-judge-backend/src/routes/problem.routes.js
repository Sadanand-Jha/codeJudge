"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var problem_controller_ts_1 = require("../controllers/problem.controller.ts");
var router = (0, express_1.Router)();
// GET /api/problems — return all problems (lightweight)
router.get("/", problem_controller_ts_1.getAllProblems);
// GET /api/problems/:problemId — return full problem detail
router.get("/:problemId", problem_controller_ts_1.getProblemByProblemId);
exports.default = router;
