"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var editor_routes_ts_1 = require("./editor.routes.ts");
var router = (0, express_1.default)();
router.use("/editor", editor_routes_ts_1.default);
exports.default = router;
