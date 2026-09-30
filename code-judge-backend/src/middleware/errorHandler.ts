import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../types/index.ts";

/**
 * Global error handler middleware.
 * Catches all errors thrown from controllers/services and returns a
 * standardized JSON error response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);
  const errorWithCode = err as Error & { code?: string | number };
  req.observabilityError = {
    name: err.name || "Error",
    code: errorWithCode.code == null ? undefined : String(errorWithCode.code),
    message: err.message || "Internal server error",
    stack: err.stack,
  };

  // Handle known application errors
  if (err instanceof NotFoundError) {
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
