"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_ts_1 = require("./admin/index.ts");
var index_ts_2 = require("./user/index.ts");
var router = (0, express_1.Router)();
router.use("/admin", index_ts_1.default);
router.use("/user", index_ts_2.default);
exports.default = router;
