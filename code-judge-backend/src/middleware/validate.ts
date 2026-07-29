import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

// ============================================
// Registration Validation Schema
// ============================================

/**
 * Registration input validation schema.
 * All inputs are sanitized, trimmed, and strictly validated
 * to prevent injection attacks and ensure data integrity.
 *
 * - username: Only alphanumeric, underscore, hyphen, dot (no SQL-special chars)
 * - email: Proper email format
 * - password: Strong password with letter + number/special char requirement
 */
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username can only contain letters, numbers, underscores, hyphens, and dots"
    )
    .transform((val) => val.toLowerCase()),

  email: z
    .string()
    .trim()
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must be at most 255 characters")
    .email("Invalid email format")
    .transform((val) => val.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
      "Password must contain at least one letter and one number or special character"
    ),
});

/**
 * Generic middleware factory that validates request body against a Zod schema.
 * Returns a middleware that:
 *   1. Parses req.body against the schema (with safeParse)
 *   2. If invalid: responds with 400 + first validation error message
 *   3. If valid: replaces req.body with the parsed (sanitized) data and calls next()
 *
 * @param schema - A Zod schema to validate against
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.errors[0];
      const field = firstError.path.join(".");
      const message = firstError.message;

      res.status(400).json({
        success: false,
        message: `Validation error${field ? ` (${field})` : ""}: ${message}`,
      });
      return;
    }

    // Replace req.body with the parsed (sanitized & transformed) data
    // This ensures the controller always receives clean, validated input
    req.body = result.data;
    next();
  };
}