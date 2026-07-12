"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
require("dotenv/config");
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var index_routes_ts_1 = require("./routes/index.routes.ts");
var errorHandler_ts_1 = require("./middleware/errorHandler.ts");
var pg_1 = require("pg");
var Pool = pg_1.default.Pool;
exports.pool = new Pool();
exports.pool.connect()
    .then(function () { return console.log('✅ Connected to PostgreSQL database successfully!'); })
    .catch(function (err) { return console.error('❌ Database connection error', err.stack); });
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api", index_routes_ts_1.default);
// Global error handler — must be registered after routes
app.use(errorHandler_ts_1.errorHandler);
exports.default = app;
