import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { isValidPredefinedAvatar } from "../constants/avatars.ts";

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
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-z0-9_.-]+$/,
      "Username can only contain lowercase letters, numbers, underscores, hyphens, and dots"
    ),

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

/** Public OTP-registration payload. Kept separate from the legacy v1 schema
 * because this flow also requires a one-time registration token and avatar. */
export const authRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9]+$/, "Username can only contain lowercase letters and numbers"),
  email: z.string().trim().max(255).email("Invalid email format").transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  registration_token: z.string().trim().min(16, "Invalid registration token").max(512),
  avatar_url: z.string().refine(isValidPredefinedAvatar, "Please select a valid avatar"),
  account_type: z.enum(["student", "teacher"]),
}).strict();

/** Profile update. Only the display name is user-editable; username and
 * email are identity fields and are intentionally rejected. */
export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, "Display name must be at most 80 characters"),
}).strict();

/** Email-or-username login. The repository still binds this value as a SQL
 * parameter; format validation is an additional boundary, not SQL escaping. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255).transform((value) => value.toLowerCase()).superRefine((value, context) => {
    const isUsername = /^[a-z0-9]{3,20}$/.test(value);
    const isEmail = z.string().email().safeParse(value).success;
    if (!isUsername && !isEmail) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email or username" });
    }
  }),
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
}).strict();

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
  audienceMode: z.enum(["public", "private", "classroom"]).optional(),
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
  status: z.enum(["draft", "scheduled", "live", "ended"]).optional(),
  registrationFields: z
    .array(z.string().trim().min(1, "Registration field name cannot be empty").max(200, "Registration field name must be at most 200 characters"))
    .max(100, "At most 100 registration fields are allowed")
    .optional(),
});

export const quizUpdateSchema = quizSchema.omit({ code: true }).partial().strict();

/**
 * Schema for quiz status updates.
 * Allows live auto-duration fields so that `endtime = now + sessionDuration` can be set.
 */
export const quizStatusSchema = z.object({
  status: z.enum(["scheduled", "live", "ended"]),
  sessionDuration: z.number().int().positive().optional(),
  endBehavior: z.enum(["manual", "auto_duration"]).optional(),
  attemptDuration: z.number().int().positive().max(1440).optional(),
});

/**
 * Schema for joining a quiz.
 */
export const joinQuizSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{16}$/, "Quiz code must contain exactly 16 letters")
    .transform((value) => value.toUpperCase()),
}).strict();

/**
 * Schema for creating a room from the public /rooms share screen.
 * A missing password asks the server to generate an 8-character one.
 */
const roomPasswordExpirySchema = z
  .number()
  .int("Expiry must be a whole number of minutes")
  .min(1, "Expiry must be at least 1 minute")
  .max(525600, "Expiry can be at most 365 days")
  .nullable()
  .optional();

export const roomCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Room name is required")
    .max(150, "Room name must be at most 150 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters")
    .optional(),
  /** Minutes until the password stops working; null = never, omitted = 24h. */
  expires_in_minutes: roomPasswordExpirySchema,
}).strict();

/** Rotating a room password accepts the same validity window. */
export const roomPasswordResetSchema = z
  .object({
    expires_in_minutes: roomPasswordExpirySchema,
  })
  .strict()
  .default({});

/**
 * Schema for joining a room by code and password. The code is normalized to
 * uppercase before it reaches the controller; malformed input still receives
 * the same generic 401 from the join handler when it is well-formed here.
 */
export const roomJoinSchema = z.object({
  // Shape/length is validated here; format failures inside the handler all
  // collapse into the same generic 401 so codes cannot be probed.
  room_code: z
    .string()
    .trim()
    .min(1, "Room code is required")
    .max(64, "Room code is too long")
    .transform((value) => value.toUpperCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
  // Answers keyed by the creator-defined field label. Validation against the
  // saved form happens in the service so field-level errors can be returned.
  registration_data: z
    .record(z.string().max(200), z.string().max(500))
    .refine((data) => Object.keys(data).length <= 100, "Too many registration answers")
    .optional(),
}).strict();

const roomRegistrationFieldSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Field id is required")
    .max(64, "Field id is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Field id contains invalid characters"),
  label: z
    .string()
    .trim()
    .min(1, "Field label is required")
    .max(200, "Field label must be at most 200 characters"),
  type: z.enum(["text", "email", "phone", "number", "select"]),
  required: z.boolean(),
  options: z
    .array(z.string().trim().min(1, "Option cannot be empty").max(100, "Option is too long"))
    .max(20, "At most 20 options are allowed")
    .optional(),
}).strict();

/** Creator-defined registration form for a room. */
export const roomRegistrationFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Form title is required")
      .max(120, "Form title must be at most 120 characters"),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters")
      .optional(),
    fields: z
      .array(roomRegistrationFieldSchema)
      .max(30, "At most 30 registration fields are allowed"),
  })
  .strict()
  .superRefine((form, ctx) => {
    const labels = new Set<string>();
    const ids = new Set<string>();

    form.fields.forEach((field, index) => {
      const labelKey = field.label.toLowerCase();
      if (labels.has(labelKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "label"],
          message: "Field labels must be unique",
        });
      }
      labels.add(labelKey);

      if (ids.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "id"],
          message: "Field ids must be unique",
        });
      }
      ids.add(field.id);

      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "options"],
          message: "Select fields need at least one option",
        });
      }
    });
  });

/**
 * Schema for quiz registration.
 */
export const quizRegistrationSchema = z.object({
  quizId: z.number().int().positive(),
  rollno: z.string().trim().max(50).optional(),
});

/**
 * Schema for starting a quiz attempt. Registration values are the
 * creator-defined form answers, keyed by field name.
 */
export const startQuizAttemptSchema = z.object({
  registrationData: z
    .record(z.string().min(1).max(200), z.string().trim().max(500, "Registration value must be at most 500 characters"))
    .refine((data) => Object.keys(data).length <= 100, "Too many registration fields")
    .optional(),
});

/**
 * Schema for the question-paper PDF renderer. The client builds a complete
 * print-ready HTML document (including inline data-URL web fonts) and the
 * backend only renders it with headless Chromium.
 */
export const paperPdfSchema = z
  .object({
    html: z.string().min(20, "html is too short").max(8_000_000, "html payload is too large"),
    footer: z
      .object({
        left: z.string().max(300).optional(),
        right: z.string().max(300).optional(),
      })
      .strict()
      .optional(),
    fontCss: z.string().max(4_000_000).optional(),
    filename: z.string().max(160).optional(),
  })
  .strict();

/** Creator Studio trusted exporter. The service performs the deep document
 * validation; this boundary caps payload shape and page count before Chromium. */
export const documentExportSchema = z
  .object({
    document: z
      .object({
        pages: z
          .array(
            z
              .object({
                blocks: z.array(z.record(z.unknown())).max(1_000).optional(),
              })
              .passthrough()
          )
          .min(1, "A document needs at least one page")
          .max(120, "Documents are limited to 120 pages"),
      })
      .passthrough(),
    format: z.enum(["pdf", "docx", "html", "png"]),
    pageIndex: z.number().int().min(0).max(119).optional(),
    filename: z.string().trim().max(160).optional(),
  })
  .strict();

/** One immutable 1–5 star rating per learner and quiz. */
const detailedQuizRatingSchema = z.object({
  quizRating: z.number().int().min(1).max(5),
  questionRating: z.number().int().min(1).max(5),
  platformRating: z.number().int().min(1).max(5),
  teacherRating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(600).optional().default(""),
}).strict();

export const quizRatingSchema = z.union([
  detailedQuizRatingSchema,
  // Keep already-open/cached review pages working while clients roll over to
  // the richer feedback form.
  z.object({ rating: z.number().int().min(1).max(5) }).strict().transform(({ rating }) => ({
    quizRating: rating,
    questionRating: rating,
    platformRating: rating,
    teacherRating: rating,
    feedback: "",
  })),
]);

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
    .max(250, "Option statement must be at most 250 characters"),
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
  options: z.array(z.string().trim()).max(100).optional(),
  textAnswer: z.string().trim().max(20000).optional(),
  timeTaken: z.number().int().nonnegative().optional(),
}).strict();

/**
 * Schema for final attempt submission. A question may occur only once; the
 * controller also normalizes into a Map as a defense-in-depth measure.
 */
export const submitQuizAttemptSchema = z.object({
  responses: z.array(z.object({
    problemId: z.number().int().positive(),
    option: z.string().trim().optional(),
    options: z.array(z.string().trim()).max(100).optional(),
    textAnswer: z.string().trim().max(20000).optional(),
  }).strict()).max(1000),
  violations: z.number().int().nonnegative().max(1000).optional(),
  flagged: z.boolean().optional(),
  flagReason: z.string().trim().max(500).optional(),
}).strict();

/**
 * Schema for reporting an exam-cell (proctoring) violation.
 * Body: { type: "tab_switch" | "window_blur" | "fullscreen_exit" | "copy_attempt" | ... }
 */
export const reportViolationSchema = z.object({
  type: z.string().trim().min(1).max(50),
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

/**
 * Schema for quiz game config upsert.
 * Mirrors DB constraints: movementSpeed > 0, lives >= 0, booleans must be booleans.
 */
export const quizGameConfigSchema = z.object({
  enabled: z.boolean({ invalid_type_error: "enabled must be a boolean" }),
  movementEnabled: z.boolean({ invalid_type_error: "movementEnabled must be a boolean" }),
  movementSpeed: z.number().int().positive("movementSpeed must be > 0"),
  lives: z.number().int().min(0, "lives must be >= 0"),
  pointsEnabled: z.boolean({ invalid_type_error: "pointsEnabled must be a boolean" }),
  powerupsEnabled: z.boolean({ invalid_type_error: "powerupsEnabled must be a boolean" }),
  respawnEnabled: z.boolean({ invalid_type_error: "respawnEnabled must be a boolean" }),
  damageEnabled: z.boolean({ invalid_type_error: "damageEnabled must be a boolean" }),
});

export const quizGameMechanicsSchema = z.object({
  mechanics: z.array(z.object({
    mechanicCode: z.string().min(1, "mechanicCode is required"),
    enabled: z.boolean({ invalid_type_error: "enabled must be a boolean" }),
    quantity: z.number().int().min(0, "quantity must be >= 0"),
  })),
});

/**
 * Encrypted quiz payload (client-side E2E encryption).
 *
 * The body contains only base64 ciphertext + a wrapped data key. The
 * teacher's key is never accepted here; `keyFingerprint` is a SHA-256 hash of
 * that key and is only used for a fast client-side mismatch check.
 *
 * Size limits keep the complete body below Express' 10 MB JSON limit.
 */
const secureQuizBlobSchema = z
  .object({
    iv: z
      .string()
      .trim()
      .length(16, "iv must be a 12-byte base64 value")
      .regex(/^[A-Za-z0-9+/]{16}$/, "iv must be base64"),
    ct: z
      .string()
      .trim()
      .min(24, "ct is too short")
      .max(4_000_000, "ct is too large")
      .regex(/^[A-Za-z0-9+/]+={0,2}$/, "ct must be base64"),
  })
  .strict();

export const secureQuizPayloadSchema = z
  .object({
    quizId: z
      .string()
      .trim()
      .min(1, "quizId is required")
      .max(128, "quizId is too long")
      .regex(/^[A-Za-z0-9_-]+$/, "quizId contains invalid characters"),
    version: z.number().int().min(1).max(10),
    algorithm: z.literal("AES-256-GCM").optional(),
    questions: secureQuizBlobSchema,
    problemHtml: secureQuizBlobSchema,
    wrappedKey: z
      .object({
        iv: z
          .string()
          .trim()
          .length(16, "iv must be a 12-byte base64 value")
          .regex(/^[A-Za-z0-9+/]{16}$/, "iv must be base64"),
        ct: z
          .string()
          .trim()
          .min(24, "ct is too short")
          .max(512, "wrapped key is too large")
          .regex(/^[A-Za-z0-9+/]+={0,2}$/, "ct must be base64"),
      })
      .strict(),
    keyFingerprint: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{64}$/, "keyFingerprint must be 64 hex characters")
      .transform((value) => value.toLowerCase()),
    createdAt: z.string().trim().max(64).optional(),
  })
  .strict();

/**
 * Browser-side encryption (KEK + DEK) envelopes. These are base64url and
 * intentionally distinct from the legacy base64 secure-payload schema above.
 */
const base64UrlValue = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too large`)
    .regex(/^[A-Za-z0-9_-]+$/, `${label} must be base64url`);

const clientEnvelopeSchema = z
  .object({
    v: z.literal(1),
    alg: z.literal("A256GCM"),
    iv: base64UrlValue(64, "iv"),
    ct: base64UrlValue(8_000_000, "ct"),
  })
  .strict();

export const quizKekConfigSchema = z
  .object({
    salt: base64UrlValue(256, "salt"),
    kdf: z
      .object({
        algorithm: z.literal("PBKDF2-HMAC-SHA-256"),
        iterations: z
          .number()
          .int()
          .min(600_000, "PBKDF2 iterations must be at least 600000")
          .max(10_000_000, "PBKDF2 iterations are too high"),
      })
      .strict(),
    check: clientEnvelopeSchema,
  })
  .strict();

export const quizClientContentSchema = z
  .object({
    wrappedDek: clientEnvelopeSchema.optional(),
    problems: z
      .array(
        z
          .object({
            problemId: z.number().int().positive().optional(),
            payloadAadId: z
              .string()
              .trim()
              .min(8, "payloadAadId is too short")
              .max(128, "payloadAadId is too long")
              .regex(
                /^[A-Za-z0-9_-]+$/,
                "payloadAadId contains invalid characters"
              ),
            payloadCt: clientEnvelopeSchema,
            quizProblemType: z.number().int().min(1).max(20),
            questionNumber: z.number().int().min(1).max(1000),
            marks: z.number().min(0).max(100_000).optional(),
            negativeMarks: z.number().min(0).max(100_000).optional(),
            difficulty: z.number().int().min(0).max(100).optional(),
            options: z
              .array(
                z
                  .object({
                    id: z.number().int().positive().optional(),
                    isCorrect: z.boolean(),
                    answerHash: z
                      .string()
                      .trim()
                      .regex(/^[0-9a-f]{64}$/, "answerHash must be 64 hex characters")
                      .nullable()
                      .optional(),
                  })
                  .strict()
              )
              .max(50),
          })
          .strict()
      )
      .min(1, "At least one encrypted question is required")
      .max(100, "Too many encrypted questions"),
  })
  .strict();
