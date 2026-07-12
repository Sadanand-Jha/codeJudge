"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
var index_ts_1 = require("../types/index.ts");
/**
 * Global error handler middleware.
 * Catches all errors thrown from controllers/services and returns a
 * standardized JSON error response.
 */
function errorHandler(err, _req, res, _next) {
    console.error("Unhandled error:", err);
    // Handle known application errors
    if (err instanceof index_ts_1.NotFoundError) {
        res.status(404).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Handle generic errors
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}
