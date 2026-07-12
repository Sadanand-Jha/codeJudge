"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var run_controller_ts_1 = require("../../../controllers/run.controller.ts");
var router = (0, express_1.Router)();
router.post("/run", run_controller_ts_1.runCode);
exports.default = router;
