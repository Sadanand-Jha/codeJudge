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

// ==================== QUIZ VALIDATION SCHEMAS ====================

/**
 * Schema for creating/updating a quiz.
 * Validates:
 * - name: required, 3-100 chars
 * - code: required, min 16 chars
 * - starttime: optional ISO date strings
 * - visibility/difficulty: optional positive integers
 * - totalMarks/passingMarks: optional non-negative numbers
 * - shuffleQuestions/shuffleOptions/showResultsImmediately/negativeMarking/leaderboard: optional booleans
 */
export const quizSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Quiz name must be at least 3 characters")
    .max(100, "Quiz name must be at most 100 characters"),
  code: z
    .string()
    .trim()
    .min(16, "Quiz code must be at least 16 characters")
    .max(64, "Quiz code must be at most 64 characters"),
  description: z.string().max(250, "Short description must be at most 250 characters").optional(),
  fullDescription: z.string().max(5000, "Detailed description must be at most 5000 characters").optional(),
  starttime: z.string().nullable().optional(),
  endtime: z.string().nullable().optional(),

  visibility: z.number().int().positive().optional(),
  difficulty: z.union([z.string(), z.number().int().positive()]).optional(),
  difficultyId: z.number().int().positive().optional(),
  subjectId: z.number().int().positive().optional(),
  examId: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  totalMarks: z.number().nonnegative().optional(),
  passingMarks: z.number().nonnegative().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResultsImmediately: z.boolean().optional(),
  negativeMarking: z.boolean().optional(),
  leaderboard: z.boolean().optional(),
});

/**
 * Schema for quiz status updates.
 */
export const quizStatusSchema = z.object({
  status: z.enum(["published", "unpublished", "draft", "archived"]),
});

/**
 * Schema for joining a quiz.
 */
export const joinQuizSchema = z.object({
  code: z.string().trim().min(16, "Invalid quiz code").optional(),
  quizId: z.number().int().positive().optional(),
}).refine((data) => data.code || data.quizId, {
  message: "Either code or quizId is required",
});

/**
 * Schema for quiz registration.
 */
export const quizRegistrationSchema = z.object({
  quizId: z.number().int().positive(),
  rollno: z.string().trim().max(50).optional(),
});

/**
 * Schema for adding/updating quiz problems.
 */
export const quizProblemSchema = z.object({
  problemStatement: z
    .string()
    .trim()
    .min(1, "Problem statement is required")
    .max(2000, "Problem statement must be at most 2000 characters"),
  problemDescription: z.string().trim().max(5000).optional(),
  quizProblemType: z.number().int().positive().optional(),
  questionNumber: z.number().int().positive().optional(),
  explanation: z.string().trim().max(2000).optional(),
  hint: z.string().trim().max(500).optional(),
  difficulty: z.number().int().positive().optional(),
  referenceNotes: z.string().trim().max(2000).optional(),
  internalComments: z.string().trim().max(1000).optional(),
});

/**
 * Schema for adding options to a quiz problem.
 */
export const quizProblemOptionSchema = z.object({
  optionStatement: z
    .string()
    .trim()
    .min(1, "Option statement is required")
    .max(1000, "Option statement must be at most 1000 characters"),
  optionDescription: z.string().trim().max(2000).optional(),
  isCorrect: z.boolean(),
});

/**
 * Schema for reordering quiz problems.
 */
export const reorderQuizProblemsSchema = z.object({
  problemIds: z.array(z.number().int().positive()).min(1, "At least one problem ID is required"),
});

/**
 * Schema for saving quiz responses.
 */
export const saveQuizResponseSchema = z.object({
  problemId: z.number().int().positive(),
  option: z.string().trim().optional(),
  textAnswer: z.string().trim().optional(),
  timeTaken: z.number().int().nonnegative().optional(),
});

/**
 * Schema for cloning a quiz.
 */
export const cloneQuizSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Quiz name must be at least 3 characters")
    .max(100, "Quiz name must be at most 100 characters"),
  code: z
    .string()
    .trim()
    .min(16, "Quiz code must be at least 16 characters")
    .max(64, "Quiz code must be at most 64 characters"),
});
