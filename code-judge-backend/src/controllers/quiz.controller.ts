// Quiz controller (largest controller). Full quiz lifecycle — CRUD for quizzes,
// problem management, options, attempts, submissions, game config, collaboration
// invites, result generation, and student-facing quiz endpoints.
import type { Request, Response } from "express";
import { pool } from "../config/database.ts";
import { QuizService } from "../services/database/quiz.service.ts";
import { ResultGenerationService } from "../services/resultGeneration.service.ts";
import { sendCollaboratorInviteEmail } from "../services/email.ts";
import { finalizeExpiredQuizAttempts, processQuizSubmission } from "../services/quizSubmission.service.ts";
import { QuizCreationLimitError } from "../services/quizCreationLimits.ts";
import { QuizQuestionLimitError } from "../services/quizQuestionLimits.ts";
import {
  acquireQuizSubmissionRecoveryLock,
  deleteFallbackQuizSubmission,
  enqueueQuizSubmission,
  getFallbackQuizSubmission,
  getQuizSubmissionJob,
  getQuizSubmissionQueue,
  isQuizSubmissionQueueConfigured,
  releaseQuizSubmissionRecoveryLock,
  storeFallbackQuizSubmission,
  type QuizSubmissionJobData,
} from "../queues/quizSubmission.queue.ts";

/**
 * Best-effort check for a live BullMQ worker on the quiz-submissions queue.
 * On serverless (Vercel) there is no long-lived worker, so an enqueue can
 * succeed (Redis reachable) yet never be consumed — the client would poll
 * `queued` forever. When no workers are detected, concurrency-limited durable
 * recovery handles grading.
 * Times out fast so submit never blocks on this probe.
 */
const hasLiveQuizWorkers = async (): Promise<boolean> => {
  try {
    const count = await Promise.race([
      getQuizSubmissionQueue().getWorkersCount(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("worker probe timeout")), 2000)
      ),
    ]);
    return typeof count === "number" && count > 0;
  } catch {
    // Cannot prove a worker exists (Redis slow / probe timeout) — treat as
    // no live worker so submit uses the durable recovery queue.
    return false;
  }
};

const quizService = new QuizService();
const resultGenerationService = new ResultGenerationService();

/**
 * Student-safe quiz DTO. Creator identity is limited to public display fields
 * plus the numeric creator id (needed for the aggregate-only creator card);
 * never send email/contact data, internal timestamps, or private configuration.
 */
const toStudentQuiz = (quiz: Record<string, any>) => {
  const now = Date.now();
  const rawStatus = String(quiz.status ?? "").toLowerCase();
  const startsAt = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
  const endsAt = quiz.endtime ? new Date(quiz.endtime).getTime() : null;
  const effectiveStatus = endsAt !== null && endsAt <= now
    ? "ended"
    : rawStatus === "scheduled" && startsAt !== null && startsAt <= now
      ? "live"
      : rawStatus;

  return ({
  id: quiz.id,
  code: quiz.code,
  name: quiz.name,
  createdby: quiz.createdby,
  starttime: quiz.starttime,
  endtime: quiz.endtime,
  duration: quiz.duration,
  total_marks: quiz.total_marks,
  passing_marks: quiz.passing_marks,
  difficulty: quiz.difficulty,
  difficulty_name: quiz.difficulty_name ?? null,
  creator_name: quiz.creator_name ?? null,
  creator_avatar_url: quiz.creator_avatar_url ?? null,
  status: effectiveStatus,
  show_results_immediately: quiz.show_results_immediately === true,
  leaderboard: quiz.leaderboard === true,
  });
};

const normalizeQuizCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const isQuizCode = (value: string) => /^[A-Z]{16}$/.test(value);

// ==================== QUIZ SETTINGS ====================

/**
 * GET /api/v1/user/quiz
 * Get all quizzes with filters, search, sorting, pagination
 */
export const getAllQuizzes = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      status,
      visibility,
      difficulty,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const userId = req.user?.userId ? Number(req.user.userId) : undefined;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const result = await quizService.getAllQuizzes({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string,
      visibility: visibility ? Number(visibility) : undefined,
      difficulty: difficulty ? Number(difficulty) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
      userId,
    });

    res.status(200).json({
      success: true,
      data: result.quizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quizzes",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId
 * Get a single quiz by ID
 */
export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const { code: _code, ...publicQuiz } = quiz as { code?: string } & Record<string, unknown>;

    res.status(200).json({
      success: true,
      data: publicQuiz,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz",
    });
  }
};

/**
 * GET /api/v1/admin/quiz/:quizId
 * Get a single quiz by ID, but only if the authenticated creator owns it.
 */
export const getAdminQuizById = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const userId = req.user?.userId ? Number(req.user.userId) : null;
    if (!userId || quiz.createdby !== userId) {
      res.status(403).json({
        success: false,
        message: "You can only access your own quiz",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    console.error("Error fetching admin quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz",
    });
  }
};

/**
 * GET /api/v1/user/quiz/code/:code
 * Get a quiz by its code
 */
export const getQuizByCode = async (req: Request, res: Response) => {
  try {
    const code = normalizeQuizCode(req.params.code);
    if (!isQuizCode(code)) {
      res.status(404).json({ success: false, message: "Quiz not found or unavailable" });
      return;
    }

    const quiz = await quizService.getQuizByCode(code);

    const status = String(quiz?.status ?? "").toLowerCase();
    if (!quiz || !["scheduled", "live"].includes(status)) {
      res.status(404).json({
        success: false,
        message: "Quiz not found or unavailable",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toStudentQuiz(quiz),
    });
  } catch (error) {
    console.error("Error fetching quiz by code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz by code",
    });
  }
};

/**
 * GET /api/v1/user/quiz/my-quizzes
 * Get quizzes created by the authenticated user.
 */
export const getMyCreatedQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const {
      page = "1",
      limit = "10",
      search = "",
      status,
      visibility,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const result = await quizService.getAllQuizzes({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string,
      visibility: visibility ? Number(visibility) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
      userId: Number(userId),
    });

    res.status(200).json({
      success: true,
      data: result.quizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching my quizzes:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching my quizzes" });
  }
};

/**
 * GET /api/v1/user/quiz/generate-code
 * Generate a unique 16-character alphabetic quiz code.
 */
export const generateQuizCodeEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const code = await quizService.generateUniqueCode();
    res.status(200).json({ success: true, data: { code } });
  } catch (error) {
    console.error("Error generating quiz code:", error);
    res.status(500).json({ success: false, message: "Internal server error while generating quiz code" });
  }
};

/**
 * POST /api/v1/user/quiz
 * Create a new quiz from the creator settings form.
 */
const generateQuizCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

/**
 * Resolve a difficulty value (numeric id or label like "Easy") to its
 * `quiz_difficulty` id.
 */
const resolveDifficultyId = async (difficulty: unknown): Promise<number | null> => {
  if (difficulty === undefined || difficulty === null) return null;
  if (typeof difficulty === "number") return difficulty;
  const result = await pool.query(
    "SELECT id FROM quiz_difficulty WHERE LOWER(heading) = LOWER($1) LIMIT 1",
    [String(difficulty)]
  );
  return result.rows.length ? result.rows[0].id : null;
};

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const code = body.code || generateQuizCode();
    const visibilityId =
      typeof body.visibility === "number" ? body.visibility : null;
    const difficultyId = body.difficultyId
      ? Number(body.difficultyId)
      : await resolveDifficultyId(body.difficulty);
    const subjectId = typeof body.subjectId === "number" ? body.subjectId : null;
    const examId = typeof body.examId === "number" ? body.examId : null;

    const calculatedTotal =
      body.totalMarks ??
      (body.marksPerQuestion ? body.marksPerQuestion * (body.totalQuestions || 0) : 0);
    const calculatedPassing =
      body.passingMarks ??
      (body.passingPercentage && calculatedTotal
        ? Math.ceil((calculatedTotal * body.passingPercentage) / 100)
        : 0);

    const quiz = await quizService.createQuiz({
      name: body.name,
      code,
      createdby: Number(userId),
      starttime: body.starttime ? new Date(body.starttime) : undefined,
      visibility: visibilityId ?? undefined,
      difficulty: difficultyId ?? undefined,
      subjectId: subjectId ?? undefined,
      examId: examId ?? undefined,
      duration: body.timeLimit ?? undefined,
      totalMarks: calculatedTotal,
      passingMarks: calculatedPassing,
      shuffleQuestions: body.randomizeQuestions,
      shuffleOptions: body.randomizeOptions,
      showResultsImmediately: body.showResultsImmediately,
      negativeMarking: body.negativeMarking,
      leaderboard: true,
      status: "draft",
    });



    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    if (error instanceof QuizCreationLimitError) {
      res.status(429).json({ success: false, message: error.message, code: error.code });
      return;
    }
    console.error("Error creating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating quiz",
    });
  }
};

/**
 * GET /api/v1/user/quiz/visibility-options
 * Returns the visibility options from the `quiz_visibility` table.
 */
export const getQuizVisibilityOptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, heading, description FROM quiz_visibility ORDER BY id ASC"
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching quiz visibility options:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz visibility options",
    });
  }
};

export const getQuizDifficultyOptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, heading FROM quiz_difficulty ORDER BY id ASC"
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching quiz difficulty options:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz difficulty options",
    });
  }
};

/**
 * PUT /api/v1/user/quiz/:quizId
 * Update a quiz
 */
export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this quiz",
      });
      return;
    }

    const updatedQuiz = await quizService.updateQuiz(Number(quizId), body);

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      data: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating quiz",
    });
  }
};

/**
 * DELETE /api/v1/user/quiz/:quizId
 * Delete a quiz
 */
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this quiz",
      });
      return;
    }

    const deleted = await quizService.deleteQuiz(Number(quizId));

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Quiz not found or already deleted",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting quiz",
    });
  }
};

/**
 * POST /api/v1/user/quiz/:quizId/clone
 * Clone a quiz
 */
export const cloneQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { name, code } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: "name and code are required for cloning",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const clonedQuiz = await quizService.cloneQuiz(Number(quizId), name, code, Number(userId));

    res.status(201).json({
      success: true,
      message: "Quiz cloned successfully",
      data: clonedQuiz,
    });
  } catch (error) {
    if (error instanceof QuizCreationLimitError) {
      res.status(429).json({ success: false, message: error.message, code: error.code });
      return;
    }
    console.error("Error cloning quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while cloning quiz",
    });
  }
};

/**
 * PATCH /api/v1/user/quiz/:quizId/status
 * Update quiz status (publish/unpublish/draft/archive)
 */
export const updateQuizStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { status, sessionDuration, endBehavior } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const validStatuses = ["scheduled", "live", "ended"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: scheduled, live, ended",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const isOwner = quiz.createdby === Number(userId);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Only the quiz owner can update this quiz",
      });
      return;
    }

    const updateData: Record<string, any> = { status };
    if (status === "live") {
      updateData.starttime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      if (endBehavior === "auto_duration" && typeof sessionDuration === "number" && sessionDuration > 0) {
        const endTime = new Date(Date.now() + sessionDuration * 60 * 1000);
        updateData.endtime = endTime.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      } else {
        updateData.endtime = null;
      }
    } else if (status === "ended") {
      updateData.endtime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
    }

    const updatedQuiz = await quizService.updateQuiz(Number(quizId), updateData);

    res.status(200).json({
      success: true,
      message: `Quiz ${status} successfully`,
      data: updatedQuiz,
    });
  } catch (error) {
    console.error("Error updating quiz status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating quiz status",
    });
  }
};

// ==================== QUESTION MANAGEMENT ====================

/**
 * POST /api/v1/user/quiz/:quizId/problems
 * Add a question to a quiz
 */
export const addQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to add questions to this quiz",
      });
      return;
    }

    const MAX_PROBLEMS = 25;
    const problemCount = await quizService.getQuizProblemCount(String(quizId));
    if (problemCount >= MAX_PROBLEMS) {
      res.status(400).json({
        success: false,
        message: `A quiz can have at most ${MAX_PROBLEMS} problems`,
      });
      return;
    }

    const problem = await quizService.createQuizProblem({
      ...body,
      quizId: Number(quizId),
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: problem,
    });
  } catch (error) {
    if (error instanceof QuizQuestionLimitError) {
      res.status(429).json({ success: false, message: error.message, code: error.code });
      return;
    }
    console.error("Error adding quiz problem:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding question",
    });
  }
};

/**
 * PUT /api/v1/user/quiz/problems/:problemId
 * Update a quiz question
 */
export const updateQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId } = req.params;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const target = await quizService.getQuizProblemById(problemId);

    if (!target) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    const quiz = await quizService.getQuizById(String(target.quiz_id));
    if (!quiz || quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this question",
      });
      return;
    }

    const updatedProblem = await quizService.updateQuizProblem(Number(problemId), body);

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedProblem,
    });
  } catch (error) {
    console.error("Error updating quiz problem:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating question",
    });
  }
};

/**
 * POST /api/v1/user/quiz/problems/save-full
 * Save a quiz problem with all its options in a single transaction (upsert)
 */
export const saveQuizProblemFull = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quizId = body.quizId;
    if (!quizId) {
      res.status(400).json({
        success: false,
        message: "quizId is required",
      });
      return;
    }

    const quiz = await quizService.getQuizById(String(quizId));
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to save questions for this quiz",
      });
      return;
    }

    // Own-quiz constraint: a problemId may only be upserted when it already
    // belongs to this quiz, preventing cross-quiz overwrites.
    if (body.problemId) {
      const target = await quizService.getQuizProblemById(body.problemId);
      if (!target) {
        res.status(404).json({
          success: false,
          message: "Question not found",
        });
        return;
      }
      if (String(target.quiz_id) !== String(quizId)) {
        res.status(403).json({
          success: false,
          message: "You can only modify questions of your own quiz",
        });
        return;
      }
    }

    const MAX_PROBLEMS = 25;
    if (!body.problemId) {
      const problemCount = await quizService.getQuizProblemCount(String(quizId));
      if (problemCount >= MAX_PROBLEMS) {
        res.status(400).json({
          success: false,
          message: `A quiz can have at most ${MAX_PROBLEMS} problems`,
        });
        return;
      }
    }

    const result = await quizService.saveQuizProblemFull({
      problemId: body.problemId || undefined,
      quizId: Number(quizId),
      problemStatement: body.problemStatement,
      problemDescription: body.problemDescription,
      quizProblemType: body.quizProblemType,
      questionNumber: body.questionNumber,
      explanation: body.explanation,
      hint: body.hint,
      difficulty: body.difficulty,
      referenceNotes: body.referenceNotes,
      internalComments: body.internalComments,
      marks: body.marks,
      negativeMarks: body.negativeMarks,
      options: body.options || [],
    });

    res.status(200).json({
      success: true,
      message: "Question saved successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof QuizQuestionLimitError) {
      res.status(429).json({ success: false, message: error.message, code: error.code });
      return;
    }
    console.error("Error saving quiz problem:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving question",
    });
  }
};

/**
 * DELETE /api/v1/user/quiz/problems/:problemId
 * Delete a quiz question
 */
export const deleteQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const target = await quizService.getQuizProblemById(problemId);

    if (!target) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    const quiz = await quizService.getQuizById(String(target.quiz_id));
    if (!quiz || quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this question",
      });
      return;
    }

    const deleted = await quizService.deleteQuizProblem(Number(problemId));

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Question not found or already deleted",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz problem:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting question",
    });
  }
};

/**
 * POST /api/v1/user/quiz/problems/:problemId/duplicate
 * Duplicate a quiz question
 */
export const duplicateQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const target = await quizService.getQuizProblemById(problemId);

    if (!target) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    const quiz = await quizService.getQuizById(String(target.quiz_id));
    if (!quiz || quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to duplicate this question",
      });
      return;
    }

    const duplicatedProblem = await quizService.duplicateQuizProblem(Number(problemId));

    res.status(201).json({
      success: true,
      message: "Question duplicated successfully",
      data: duplicatedProblem,
    });
  } catch (error) {
    if (error instanceof QuizQuestionLimitError) {
      res.status(429).json({ success: false, message: error.message, code: error.code });
      return;
    }
    console.error("Error duplicating quiz problem:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while duplicating question",
    });
  }
};

/**
 * PUT /api/v1/user/quiz/:quizId/reorder
 * Reorder quiz questions
 * Body: { "problemIds": number[] }
 */
export const reorderQuizProblems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { problemIds } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!Array.isArray(problemIds)) {
      res.status(400).json({
        success: false,
        message: "problemIds must be an array",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to reorder questions in this quiz",
      });
      return;
    }

    await quizService.reorderQuizProblems(Number(quizId), problemIds);

    res.status(200).json({
      success: true,
      message: "Questions reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering quiz problems:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while reordering questions",
    });
  }
};

/**
 * POST /api/v1/user/quiz/problems/:problemId/options
 * Add an option to a quiz question
 */
export const addQuizProblemOption = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { problemId } = req.params;
    const body = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const target = await quizService.getQuizProblemById(problemId);

    if (!target) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    const quiz = await quizService.getQuizById(String(target.quiz_id));
    if (!quiz || quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to add options to this question",
      });
      return;
    }

    const option = await quizService.createQuizProblemOption({
      ...body,
      problemId: Number(problemId),
    });

    res.status(201).json({
      success: true,
      message: "Option added successfully",
      data: option,
    });
  } catch (error) {
    console.error("Error adding quiz problem option:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding option",
    });
  }
};

// ==================== QUIZ ATTEMPT ====================

/**
 * POST /api/v1/user/quiz/:quizId/start
 * Start a quiz attempt
 */
export const startQuizAttempt = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    // Resolve an earlier attempt that expired while the student's browser was
    // closed before deciding whether this request should resume or reattempt.
    await finalizeExpiredQuizAttempts({ quizId: Number(quizId), userId: Number(userId) });

    const access = await quizService.checkQuizAccess(Number(userId), Number(quizId));
    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason || "You are not allowed to access this quiz",
        ...(typeof access.attemptsMade === "number"
          ? { data: { attemptsMade: access.attemptsMade, maxAttempts: access.maxAttempts ?? 5 } }
          : {}),
      });
      return;
    }

    const problems = await attachQuizProblemOptions(quizId, false);
    const quiz = await quizService.getQuizById(quizId);

    const stableShuffle = <T>(items: T[], seed: number): T[] => {
      const output = [...items];
      let state = seed || 1;
      for (let index = output.length - 1; index > 0; index--) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const swapIndex = state % (index + 1);
        [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
      }
      return output;
    };

    const buildAttemptPayload = async (attempt: any, resumed: boolean) => {
      const savedResponses = await quizService.getStudentResponses(Number(attempt.id), Number(userId));
      const startedAtMs = new Date(attempt.started_at ?? attempt.created_at).getTime();
      const durationDeadline = quiz?.duration
        ? startedAtMs + Number(quiz.duration) * 60_000
        : Number.POSITIVE_INFINITY;
      const quizDeadline = quiz?.endtime
        ? new Date(quiz.endtime).getTime()
        : Number.POSITIVE_INFINITY;
      const deadlineMs = Math.min(durationDeadline, quizDeadline);
      const remainingSeconds = Number.isFinite(deadlineMs)
        ? Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000))
        : null;
      // Student attempts always receive a stable per-attempt order. The seed
      // keeps refresh/resume consistent while different attempts can differ;
      // creator and Studio views continue to use the authored order.
      const orderedProblems = stableShuffle(problems, Number(attempt.id)).map((problem: any) => ({
        ...problem,
        options: stableShuffle(problem.options ?? [], Number(attempt.id) + Number(problem.id)),
      }));
      return { attempt, problems: orderedProblems, savedResponses, remainingSeconds, resumed };
    };

    if (access.reason === "resume") {
      const attempt = await quizService.getQuizAttempt(Number(userId), Number(quizId));
      // Keep the question count fresh (questions may have been added after join).
      if (attempt && Number(attempt.total_questions) !== problems.length) {
        try {
          const refreshed = await quizService.updateQuizAttempt(Number(attempt.id), { total_questions: problems.length });
          if (refreshed) {
            return res.status(200).json({
              success: true,
              message: "Resuming existing quiz attempt",
              data: await buildAttemptPayload(refreshed, true),
            });
          }
        } catch {
          // Fall through with the stored attempt — count mismatch is non-fatal.
        }
      }
      return res.status(200).json({
        success: true,
        message: "Resuming existing quiz attempt",
        data: await buildAttemptPayload(attempt, true),
      });
    }

    const totalQuestions = problems.length;

    if (totalQuestions === 0) {
      res.status(400).json({
        success: false,
        message: "This quiz has no questions",
      });
      return;
    }

    const attempt = await quizService.createQuizAttempt({
      userId: Number(userId),
      quizId: Number(quizId),
      totalQuestions,
    });

    res.status(201).json({
      success: true,
      message: "Quiz started successfully",
      data: {
        ...(await buildAttemptPayload(attempt, false)),
      },
    });
  } catch (error: any) {
    if (error?.code === "MAX_ATTEMPTS_REACHED") {
      res.status(403).json({
        success: false,
        message: error.message || "Maximum 5 attempts reached for this quiz",
      });
      return;
    }
    console.error("Error starting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while starting quiz",
    });
  }
};

/**
 * POST /api/v1/user/quiz/attempt/:attemptId/save
 * Autosave answers for a quiz attempt
 */
export const saveQuizResponse = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;
    const { problemId, answer, option, options, textAnswer, timeTaken } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!problemId) {
      res.status(400).json({
        success: false,
        message: "problemId is required",
      });
      return;
    }

    const attempt = await quizService.getQuizAttemptById(Number(attemptId));
    if (!attempt || Number(attempt.user_id) !== Number(userId) || attempt.status !== "in_progress") {
      res.status(404).json({ success: false, message: "Active quiz attempt not found" });
      return;
    }

    const attemptQuiz = await quizService.getQuizById(String(attempt.quiz_id));
    const attemptStartedAt = attempt.started_at ?? attempt.created_at;
    const durationDeadline = attemptQuiz?.duration && attemptStartedAt
      ? new Date(attemptStartedAt).getTime() + Number(attemptQuiz.duration) * 60_000
      : Number.POSITIVE_INFINITY;
    const quizDeadline = attemptQuiz?.endtime
      ? new Date(attemptQuiz.endtime).getTime()
      : Number.POSITIVE_INFINITY;
    if (Date.now() > Math.min(durationDeadline, quizDeadline)) {
      res.status(409).json({ success: false, message: "Quiz time has expired; submit your saved attempt" });
      return;
    }

    const problem = await quizService.getQuizProblemById(Number(problemId));
    if (!problem || Number(problem.quiz_id) !== Number(attempt.quiz_id)) {
      res.status(400).json({ success: false, message: "Question does not belong to this quiz" });
      return;
    }

    const response = await quizService.saveStudentResponse({
      attemptId: Number(attemptId),
      problemId: Number(problemId),
      answer,
      option,
      options,
      textAnswer,
      timeTaken,
    });

    res.status(200).json({
      success: true,
      message: "Response saved successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error saving quiz response:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving response",
    });
  }
};

/**
 * POST /api/v1/user/quiz/attempt/:attemptId/heartbeat
 * Keeps a quiz attempt visible to the creator only while the student's exam
 * page is actively open. The responses dashboard treats old heartbeats as
 * in-progress, not live.
 */
export const heartbeatQuizAttempt = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const attempt = await quizService.getQuizAttemptById(Number(attemptId));
    if (!attempt || Number(attempt.user_id) !== Number(userId) || attempt.status !== "in_progress") {
      res.status(404).json({ success: false, message: "Active quiz attempt not found" });
      return;
    }

    const quiz = await quizService.getQuizById(String(attempt.quiz_id));
    const startedAt = attempt.started_at ?? attempt.created_at;
    const durationDeadline = quiz?.duration && startedAt
      ? new Date(startedAt).getTime() + Number(quiz.duration) * 60_000
      : Number.POSITIVE_INFINITY;
    const quizDeadline = quiz?.endtime ? new Date(quiz.endtime).getTime() : Number.POSITIVE_INFINITY;
    if (Date.now() > Math.min(durationDeadline, quizDeadline)) {
      res.status(409).json({ success: false, message: "Quiz time has expired" });
      return;
    }

    await quizService.touchQuizAttempt(Number(attemptId));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error recording quiz attempt heartbeat:", error);
    res.status(500).json({ success: false, message: "Unable to update quiz activity" });
  }
};

/**
 * Exam-cell: maximum proctoring violations before an attempt is auto-flagged.
 * The frontend counts a violation per episode (tab switch, window blur,
 * fullscreen exit, copy/cut/paste attempt) and reports each one here.
 */
export const MAX_PROCTORING_VIOLATIONS = 3;

/**
 * POST /api/v1/user/quiz/attempt/:attemptId/violation
 * Record one exam-cell (proctoring) violation for an in-progress attempt.
 * Body: { type: string }
 * At MAX_PROCTORING_VIOLATIONS the attempt is flagged for examiner review
 * (flagged = true) so the frontend can auto-submit it.
 */
export const reportViolation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;
    const { type } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const attempt = await quizService.getQuizAttemptById(Number(attemptId));
    if (!attempt || Number(attempt.user_id) !== Number(userId)) {
      res.status(404).json({ success: false, message: "Quiz attempt not found" });
      return;
    }

    if (attempt.status !== "in_progress") {
      res.status(400).json({ success: false, message: "Attempt is no longer active" });
      return;
    }

    const violations = (Number(attempt.violations) || 0) + 1;
    const flagged = violations >= MAX_PROCTORING_VIOLATIONS;
    const entry = `${String(type)}#${violations}`;
    const flagReason = attempt.flag_reason ? `${attempt.flag_reason}; ${entry}` : entry;

    const updated = await quizService.updateQuizAttempt(Number(attemptId), {
      violations,
      flagged,
      flag_reason: flagReason,
    });

    res.status(200).json({
      success: true,
      data: {
        violations: updated?.violations ?? violations,
        flagged: updated?.flagged ?? flagged,
        maxAllowed: MAX_PROCTORING_VIOLATIONS,
      },
    });
  } catch (error) {
    console.error("Error reporting quiz violation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while reporting violation",
    });
  }
};

/**
 * POST /api/v1/user/quiz/attempt/:attemptId/submit
 * Submit a quiz attempt with batch responses
 * Body: { responses: Array<{ problemId: number, option?: string, textAnswer?: string }> }
 *
 * Async flow: validates + enqueues a BullMQ grading job and returns 202
 * immediately. The client polls GET /attempt/:attemptId/submit-status.
 * If BullMQ is unreachable, the Upstash REST fallback remains durable and the
 * client polls until controlled recovery grading completes.
 */
export const submitQuizAttempt = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;
    const { responses } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!Array.isArray(responses)) {
      res.status(400).json({
        success: false,
        message: "Invalid request: responses must be an array",
      });
      return;
    }

    const numericAttemptId = Number(attemptId);
    if (!Number.isInteger(numericAttemptId) || numericAttemptId <= 0) {
      res.status(400).json({ success: false, message: "Invalid quiz attempt" });
      return;
    }

    // Ownership, attempt state and deadline are validated again by the grading
    // worker. Keeping the intake path Redis-only prevents a simultaneous exam
    // finish from opening one database connection per student.
    const body = req.body as {
      responses?: unknown;
      violations?: unknown;
      flagged?: unknown;
      flagReason?: unknown;
    };
    const violations = Number(body.violations) || 0;
    const flagged = body.flagged === true || violations >= MAX_PROCTORING_VIOLATIONS;
    const sentReason = typeof body.flagReason === "string" ? body.flagReason.trim().slice(0, 500) : "";
    const flagReason = flagged ? sentReason || "auto-flagged" : undefined;

    const jobData: QuizSubmissionJobData = {
      attemptId: numericAttemptId,
      userId: Number(userId),
      responses,
      violations,
      flagged,
      ...(flagReason !== undefined ? { flagReason } : {}),
      // Final lateness is calculated against submittedAt by the worker.
      isLate: false,
      submittedAt: new Date().toISOString(),
    };

    // Store a durable HTTP-Redis copy before touching BullMQ. This survives a
    // missing RESP endpoint/worker and is consumed by the controlled recovery
    // path in getSubmitStatus.
    await storeFallbackQuizSubmission(jobData);

    if (!isQuizSubmissionQueueConfigured()) {
      res.status(202).json({
        success: true,
        message: "Submission safely queued for grading",
        data: { attemptId: numericAttemptId, jobId: `fallback-${numericAttemptId}`, status: "queued" },
      });
      return;
    }

    try {
      const job = await enqueueQuizSubmission(jobData);
      const state = await job.getState().catch(() => "unknown");
      if (state === "completed") {
        // Double-submit after a finished job: return the graded attempt directly.
        const finishedJob = await getQuizSubmissionJob(attemptId).catch(() => undefined);
        const finished = finishedJob?.returnvalue ?? null;
        res.status(200).json({
          success: true,
          message: "Quiz submitted successfully",
          data: finished,
        });
        return;
      }
      // If no long-lived worker exists (normal on Vercel), remove the BullMQ
      // copy and leave the durable Upstash job for controlled poll recovery.
      if (state !== "active") {
        const liveWorkers = await hasLiveQuizWorkers();
        if (!liveWorkers) {
          console.warn(`No live quiz-submission workers detected for attempt ${attemptId}; using durable recovery queue`);
          await job.remove().catch(() => undefined);
          res.status(202).json({
            success: true,
            message: "Submission safely queued for grading",
            data: { attemptId: numericAttemptId, jobId: `fallback-${numericAttemptId}`, status: "queued" },
          });
          return;
        }
      }
      res.status(202).json({
        success: true,
        message: "Submission queued for grading",
        data: { attemptId: Number(attemptId), jobId: job.id, status: "queued" },
      });
    } catch (queueError) {
      // BullMQ RESP is optional on Vercel. The Upstash copy above is durable,
      // so acknowledge it without running a database-heavy inline grader.
      console.warn("BullMQ enqueue failed; using durable recovery queue:", (queueError as Error).message);
      res.status(202).json({
        success: true,
        message: "Submission safely queued for grading",
        data: { attemptId: numericAttemptId, jobId: `fallback-${numericAttemptId}`, status: "queued" },
      });
    }
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while submitting quiz",
    });
  }
};

/**
 * GET /api/v1/user/quiz/attempt/:attemptId/submit-status
 * Poll the grading status of a submission: queued | processing | completed | failed.
 * On completed, `data.attempt` holds the graded attempt (same shape as the old
 * synchronous submit response).
 */
export const getSubmitStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    let jobState: string | null = null;
    let queuedJobData: QuizSubmissionJobData | null = null;
    let bullmqJob: Awaited<ReturnType<typeof getQuizSubmissionJob>>;
    try {
      if (!isQuizSubmissionQueueConfigured()) throw new Error("BullMQ is not configured");
      bullmqJob = await getQuizSubmissionJob(attemptId);
      if (bullmqJob) {
        queuedJobData = bullmqJob.data as QuizSubmissionJobData;
        if (Number(queuedJobData.userId) !== Number(userId)) {
          res.status(404).json({ success: false, message: "Quiz attempt not found" });
          return;
        }
        jobState = await bullmqJob.getState();
        if (jobState === "completed") {
          await deleteFallbackQuizSubmission(attemptId);
          res.status(200).json({
            success: true,
            data: { attemptId: Number(attemptId), status: "completed", attempt: bullmqJob.returnvalue ?? null },
          });
          return;
        }
        if (jobState === "failed") {
          res.status(200).json({
            success: true,
            data: { attemptId: Number(attemptId), status: "failed", error: bullmqJob.failedReason ?? "Grading failed" },
          });
          return;
        }
        if (jobState === "active") {
          res.status(200).json({ success: true, data: { attemptId: Number(attemptId), status: "processing" } });
          return;
        }
        if (await hasLiveQuizWorkers()) {
          res.status(200).json({ success: true, data: { attemptId: Number(attemptId), status: "queued" } });
          return;
        }
      }
    } catch {
      jobState = null;
    }

    if (!queuedJobData) queuedJobData = await getFallbackQuizSubmission(attemptId);
    if (queuedJobData) {
      if (Number(queuedJobData.userId) !== Number(userId)) {
        res.status(404).json({ success: false, message: "Quiz attempt not found" });
        return;
      }

      const recoveryToken = await acquireQuizSubmissionRecoveryLock();
      if (!recoveryToken) {
        res.status(200).json({ success: true, data: { attemptId: Number(attemptId), status: "queued" } });
        return;
      }

      try {
        const recovered = await processQuizSubmission(queuedJobData);
        await deleteFallbackQuizSubmission(attemptId);
        await bullmqJob?.remove().catch(() => undefined);
        res.status(200).json({
          success: true,
          data: { attemptId: Number(attemptId), status: "completed", attempt: recovered },
        });
        return;
      } catch (recoveryError) {
        const message = recoveryError instanceof Error ? recoveryError.message : "Grading failed";
        if (message === "Quiz attempt not found") {
          await deleteFallbackQuizSubmission(attemptId);
          await bullmqJob?.remove().catch(() => undefined);
          res.status(404).json({ success: false, message: "Quiz attempt not found" });
          return;
        }
        console.error("Controlled submission recovery failed; job remains queued:", recoveryError);
        res.status(200).json({ success: true, data: { attemptId: Number(attemptId), status: "queued" } });
        return;
      } finally {
        await releaseQuizSubmissionRecoveryLock(recoveryToken);
      }
    }

    // No queue record remains. A single lightweight lookup handles legacy
    // inline/completed attempts without repeatedly querying during polling.
    const attempt = await quizService.getQuizAttemptById(Number(attemptId));
    if (!attempt || Number(attempt.user_id) !== Number(userId)) {
      res.status(404).json({ success: false, message: "Quiz attempt not found" });
      return;
    }
    if (attempt.status === "completed" || attempt.status === "timed_out") {
      res.status(200).json({
        success: true,
        data: { attemptId: Number(attemptId), status: "completed", attempt },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { attemptId: Number(attemptId), status: jobState ? "queued" : "none", attempt },
    });
  } catch (error) {
    console.error("Error fetching submit status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching submit status",
    });
  }
};

// ==================== USER QUIZZES ====================

/**
 * GET /api/v1/user/quiz/my
 * Get the authenticated user's quiz registrations
 */
export const getMyQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quizzes = await quizService.getUserQuizzes(userId);

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error("Error fetching user quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user quizzes",
    });
  }
};

/**
 * POST /api/v1/user/quiz/register
 * Register the authenticated user for a quiz
 * Body: { "quizId": string, "rollno": string }
 */
export const registerForQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!quizId) {
      res.status(400).json({
        success: false,
        message: "quizId is required",
      });
      return;
    }

    const quizCheck = await quizService.checkQuizAccessForRegistration(quizId, Number(userId));
    if (!quizCheck.allowed) {
      res.status(403).json({
        success: false,
        message: quizCheck.reason,
      });
      return;
    }

    // Student registration is temporarily disabled. Keep this legacy endpoint
    // compatible for older clients, but do not create quiz_registration rows.
    res.status(200).json({
      success: true,
      message: "Registration is not required for this quiz",
      data: null,
    });
  } catch (error) {
    console.error("Error registering for quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while registering for quiz",
    });
  }
};

export const unregisterFromQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const quizId = Number(req.params.quizId);
    if (!userId) return void res.status(401).json({ success: false, message: "Unauthorized access" });
    if (!Number.isInteger(quizId) || quizId <= 0) {
      return void res.status(400).json({ success: false, message: "Invalid quizId" });
    }
    const attempt = await quizService.getQuizAttempt(Number(userId), quizId);
    if (attempt?.status === "in_progress") {
      return void res.status(409).json({ success: false, message: "An active attempt cannot be unregistered" });
    }
    const removed = await quizService.unregisterUser(String(userId), String(quizId));
    if (!removed) return void res.status(404).json({ success: false, message: "Active registration not found" });
    res.status(200).json({ success: true, message: "Unregistered successfully" });
  } catch (error) {
    console.error("Error unregistering from quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while unregistering" });
  }
};

// ==================== PREVIOUS QUIZZES ====================

/**
 * GET /api/v1/user/quiz/previous
 * Get previous quizzes (attempted by logged-in student)
 */
export const getPreviousQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      page = "1",
      limit = "10",
      search = "",
      status = "",
      sortBy = "completed_at",
      sortOrder = "DESC",
    } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const result = await quizService.getPreviousQuizzes(Number(userId), {
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      status: status as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
    });

    res.status(200).json({
      success: true,
      data: result.quizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching previous quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching previous quizzes",
    });
  }
};

// ==================== RESULTS & REVIEW ====================

async function resolveRatingQuizId(identifier: string | undefined): Promise<number | null> {
  const value = String(identifier ?? "").trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const numericId = Number(value);
    return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
  }

  const quiz = await quizService.getQuizByCode(value.toUpperCase());
  const resolvedId = Number(quiz?.id);
  return Number.isSafeInteger(resolvedId) && resolvedId > 0 ? resolvedId : null;
}

/**
 * GET /api/v1/user/quiz/:quizId/rating
 * Return the current learner's eligibility/rating and anonymous aggregates.
 */
export const getQuizRating = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    const quizId = await resolveRatingQuizId(req.params.quizId);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    if (!quizId) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const rating = await quizService.getQuizRatingState(quizId, userId);
    if (!rating) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    res.status(200).json({ success: true, data: rating });
  } catch (error) {
    console.error("Error fetching quiz rating:", error);
    res.status(500).json({ success: false, message: "Could not load quiz rating" });
  }
};

/**
 * GET /api/v1/user/quiz/creator/:creatorId/stats
 * Public creator card for the join page. Aggregate-only (username, avatar,
 * counts, anonymous teacher-rating average) — never personal info.
 */
export const getCreatorStats = async (req: Request, res: Response) => {
  try {
    const creatorId = Number(req.params.creatorId);
    if (!Number.isInteger(creatorId) || creatorId <= 0) {
      res.status(400).json({ success: false, message: "Invalid creator ID" });
      return;
    }

    const stats = await quizService.getCreatorPublicStats(creatorId);
    if (!stats) {
      res.status(404).json({ success: false, message: "Creator not found" });
      return;
    }
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching creator stats:", error);
    res.status(500).json({ success: false, message: "Could not load creator stats" });
  }
};

/**
 * POST /api/v1/user/quiz/:quizId/rating
 * Only a learner with a completed attempt may rate. A completed attempt means
 * the quiz has ended for that learner, even if a shared live session remains open.
 */
export const submitQuizRating = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    const quizId = await resolveRatingQuizId(req.params.quizId);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    if (!quizId) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const result = await quizService.createQuizRating(quizId, userId, req.body);
    if (result.status === "created") {
      res.status(201).json({ success: true, data: result.rating, message: "Rating submitted" });
      return;
    }

    const failures = {
      quiz_not_found: { status: 404, message: "Quiz not found" },
      already_rated: { status: 409, message: "You have already rated this quiz" },
      no_completed_attempt: { status: 403, message: "Only students who completed this quiz can rate it" },
    } as const;
    const failure = failures[result.status];
    res.status(failure.status).json({ success: false, message: failure.message });
  } catch (error) {
    console.error("Error submitting quiz rating:", error);
    res.status(500).json({ success: false, message: "Could not submit quiz rating" });
  }
};

function areStudentResultsAvailable(result: any): boolean {
  if (result?.show_results_immediately === true) return true;
  if (String(result?.quiz_status_name ?? "").toLowerCase() === "ended") return true;
  if (!result?.endtime) return false;
  return new Date(result.endtime).getTime() <= Date.now();
}

/**
 * GET /api/v1/user/quiz/result/:attemptId
 * Get quiz result
 */
export const getQuizResult = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const result = await quizService.getQuizResult(Number(attemptId), Number(userId));

    if (!result) {
      res.status(404).json({
        success: false,
        message: "Quiz result not found",
      });
      return;
    }

    if (!areStudentResultsAvailable(result)) {
      res.status(403).json({
        success: false,
        message: "Results will be available after the quiz ends",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching quiz result:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz result",
    });
  }
};

/**
 * GET /api/v1/user/quiz/result/:attemptId/review
 * Get question-wise review for a quiz attempt
 */
export const getQuizReview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const result = await quizService.getQuizResult(Number(attemptId), Number(userId));
    if (!result) {
      res.status(404).json({ success: false, message: "Quiz result not found" });
      return;
    }
    if (!areStudentResultsAvailable(result)) {
      res.status(403).json({
        success: false,
        message: "Answer review will be available after the quiz ends",
      });
      return;
    }

    const review = await quizService.getQuestionWiseReview(Number(attemptId), Number(userId));

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error("Error fetching quiz review:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz review",
    });
  }
};

// ==================== RESULT GENERATION ====================

/**
 * POST /api/v1/user/quiz/:quizId/generate-results
 * Manually generate results for a quiz (creator only)
 * Body: { force?: boolean, sendEmail?: boolean }
 */
export const generateQuizResults = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { force = false, sendEmail = true } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to generate results for this quiz",
      });
      return;
    }

    const result = await resultGenerationService.generateResults(Number(quizId), { force, sendEmail });

    res.status(200).json({
      success: true,
      message: result.emailSent
        ? "Results generated and email sent successfully"
        : "Results generated successfully, but email delivery failed",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESULTS_ALREADY_GENERATED") {
      res.status(409).json({
        success: false,
        message: "Results have already been generated. Use force=true to regenerate.",
        code: "RESULTS_ALREADY_GENERATED",
      });
      return;
    }
    console.error("Error generating quiz results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating quiz results",
    });
  }
};

/**
 * POST /api/v1/user/quiz/:quizId/retry-email
 * Retry sending the marksheet email without recalculating results (creator only)
 */
export const retryQuizResultsEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to retry email for this quiz",
      });
      return;
    }

    const result = await resultGenerationService.retryEmail(Number(quizId));

    res.status(200).json({
      success: true,
      message: result.emailSent ? "Email sent successfully" : "Email delivery failed",
      data: result,
    });
  } catch (error) {
    console.error("Error retrying quiz results email:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrying quiz results email",
    });
  }
};

// ==================== LEADERBOARD ====================

/**
 * GET /api/v1/user/quiz/:quizId/leaderboard
 * Get quiz leaderboard
 */
export const getQuizLeaderboard = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (!quiz.leaderboard) {
      const userId = req.user?.userId;
      if (!userId || quiz.createdby !== Number(userId)) {
        res.status(403).json({
          success: false,
          message: "Leaderboard is disabled for this quiz",
        });
        return;
      }
    }

    const leaderboard = await quizService.getQuizLeaderboard(Number(quizId));

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching leaderboard",
    });
  }
};

// ==================== CROWD ====================

/**
 * GET /api/v1/user/quiz/:quizId/crowd
 * Avatar-only participant list for the join-page background. Returns just
 * avatar URLs plus a coarse live status (submitted/attempting) for the
 * presence dot — no ranks, scores, names, or other user details.
 */
export const getQuizCrowd = async (req: Request, res: Response) => {
  try {
    const quizId = Number(req.params.quizId);
    if (!Number.isInteger(quizId) || quizId <= 0) {
      res.status(400).json({ success: false, message: "Invalid quiz ID" });
      return;
    }

    const avatars = await quizService.getQuizCrowdAvatars(quizId);
    res.status(200).json({ success: true, data: avatars });
  } catch (error) {
    console.error("Error fetching quiz crowd:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz crowd",
    });
  }
};

// ==================== ANALYTICS ====================

/**
 * GET /api/v1/user/quiz/:quizId/analytics
 * Get quiz analytics (only for quiz owner)
 */
export const getQuizAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to view analytics for this quiz",
      });
      return;
    }

    await finalizeExpiredQuizAttempts({ quizId: Number(quizId) });
    const analytics = await quizService.getQuizAnalytics(Number(quizId));

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz analytics",
    });
  }
};

// ==================== QUIZ PROBLEMS & OPTIONS ====================

const attachQuizProblemOptions = async (quizId: string, includeCorrectAnswers: boolean) => {
  const problems = await quizService.getQuizProblems(quizId);

  return Promise.all(
    problems.map(async (problem: any) => {
      const options = await quizService.getQuizProblemOptions(String(problem.id));
      if (includeCorrectAnswers) return { ...problem, options };

      const {
        explaination: _explanation,
        hint: _hint,
        reference_notes: _referenceNotes,
        internal_comments: _internalComments,
        created_at: _createdAt,
        updated_at: _updatedAt,
        ...studentProblem
      } = problem;
      return {
        ...studentProblem,
        // Non-choice rows store their expected answer in the option columns.
        // Never send those rows to students; the attempt UI renders a text
        // input and grading remains server-side.
        options: [1, 2, 3].includes(Number(problem.quiz_problem_type))
          ? options.map(({ iscorrect, created_at, updated_at, ...option }: any) => option)
          : [],
      };
    })
  );
};

/**
 * GET /api/v1/user/quiz/:quizId/problems
 * Get all problems for a quiz
 */
export const getQuizProblemsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.userId;
    const quiz = await quizService.getQuizById(quizId);
    if (!userId || !quiz || Number(quiz.createdby) !== Number(userId)) {
      res.status(403).json({ success: false, message: "Creator access required" });
      return;
    }
    const problemsWithOptions = await attachQuizProblemOptions(quizId, true);

    res.status(200).json({
      success: true,
      data: problemsWithOptions,
    });
  } catch (error) {
    console.error("Error fetching quiz problems:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz problems",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId/problems/public
 * Get quiz problems without exposing correct answers
 */
export const getQuizProblemsPublicController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const access = await quizService.checkQuizAccess(Number(userId), Number(quizId));
    if (!access.allowed) {
      res.status(403).json({ success: false, message: access.reason || "Quiz access denied" });
      return;
    }
    
    const problemsWithOptions = await attachQuizProblemOptions(quizId, false);

    res.status(200).json({
      success: true,
      data: problemsWithOptions,
    });
  } catch (error) {
    console.error("Error fetching public quiz problems:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz problems",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId/register
 * Register for a quiz by code or ID
 */
export const joinQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const quiz = await quizService.getQuizByCode(code);

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const access = await quizService.checkQuizAccessForRegistration(String(quiz.id), Number(userId));
    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason || "You are not allowed to join this quiz",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Quiz is ready to join",
      data: {
        quiz: toStudentQuiz(quiz),
        // Joining an assessment must never silently register a student.
        // Registration fields are currently disabled, so an authenticated,
        // eligible student can proceed directly to the waiting room/attempt.
        registration: null,
        attempt: null,
      },
    });
  } catch (error) {
    console.error("Error joining quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while joining quiz",
    });
  }
};


// ======================= SUBJECTS CONTROLLER =======================

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const { search = "" } = req.query;
    const subjects = await quizService.getAllSubjects(search as string);
    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching subjects",
    });
  }
}

export const getAllExamCategories = async (req: Request, res: Response) => {
  try {
    const { search = "" } = req.query;
    const examCategories = await quizService.getAllExamCategories(search as string);
    res.status(200).json({
      success: true,
      data: examCategories,
    });
  } catch (error) {
    console.error("Error fetching exam categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching exam categories",
    });
  }
}

// ==================== COLLABORATOR REQUESTS ====================

/**
 * POST /api/v1/user/quiz/:quizId/collaborators/request
 * Send a collaborator request (owner only). Does NOT add the user directly.
 * Body: { userId: string | number }
 */
export const sendCollaboratorRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { userId: targetIdentifier } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    if (!targetIdentifier) {
      res.status(400).json({ success: false, message: "userId is required" });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({ success: false, message: "Only the quiz owner can send collaborator requests" });
      return;
    }

    const targetUserId = await quizService.resolveUserId(String(targetIdentifier).trim());
    if (!targetUserId) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (targetUserId === Number(userId)) {
      res.status(400).json({ success: false, message: "You cannot invite yourself" });
      return;
    }

    if (await quizService.isAcceptedCollaborator(targetUserId, Number(quizId))) {
      res.status(409).json({ success: false, message: "This user is already a collaborator" });
      return;
    }

    const existing = await quizService.getCollaboratorRequest(Number(quizId), targetUserId);
    if (existing && existing.status === "pending") {
      res.status(409).json({ success: false, message: "A request is already pending for this user" });
      return;
    }

    const request = await quizService.sendCollaboratorRequest({
      quizId: Number(quizId),
      userId: targetUserId,
      invitedBy: Number(userId),
    });

    // Fire-and-forget email notification to the invitee.
    const targetUser = await quizService.getUserContactById(targetUserId);
    const inviter = await quizService.getUserContactById(Number(userId));
    if (targetUser?.email) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const inviteUrl = `${frontendUrl}/profile`;
      sendCollaboratorInviteEmail({
        to: targetUser.email,
        quizName: quiz.name,
        inviterUsername: inviter?.username || "A user",
        inviteUrl,
      }).catch((err) => console.error("Failed to send collaborator invite email:", err));
    }

    res.status(201).json({
      success: true,
      message: "Collaborator request sent",
      data: request,
    });
  } catch (error) {
    console.error("Error sending collaborator request:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while sending collaborator request",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId/collaborators
 * Get all collaborator requests (with status) + accepted collaborators — owner/collaborator only.
 */
export const getQuizCollaborators = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const isOwner = quiz.createdby === Number(userId);
    const isCollaborator = await quizService.isAcceptedCollaborator(Number(userId), Number(quizId));
    if (!isOwner && !isCollaborator) {
      res.status(403).json({ success: false, message: "You are not authorized to view collaborators" });
      return;
    }

    const requests = await quizService.getCollaboratorRequests(Number(quizId));
    const collaborators = requests.filter((r: any) => r.status === "accepted");
    const pending = requests.filter((r: any) => r.status === "pending");
    const rejected = requests.filter((r: any) => r.status === "rejected");

    res.status(200).json({
      success: true,
      data: { requests, collaborators, pending, rejected },
    });
  } catch (error) {
    console.error("Error fetching quiz collaborators:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz collaborators",
    });
  }
};

/**
 * GET /api/v1/user/quiz/collaborations
 * Get the quizzes/projects the authenticated user is a collaborator on.
 * Distinguishes "creator" (user created it and has accepted collaborators)
 * from "collaborator" (user is an accepted collaborator on someone else's quiz).
 */
export const getMyCollaborations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const projects = await quizService.getCollaborationProjects(Number(userId));
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching collaboration projects:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching collaboration projects",
    });
  }
};

/**
 * GET /api/v1/user/quiz/collaborator-requests/incoming
 * Get incoming collaborator requests for the authenticated user (recipient).
 */
export const getIncomingCollaboratorRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const requests = await quizService.getIncomingCollaboratorRequests(Number(userId));
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching incoming collaborator requests:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching collaborator requests",
    });
  }
};

/**
 * PATCH /api/v1/user/quiz/collaborator-requests/:quizId
 * Accept or reject a collaborator request (recipient only).
 * Body: { status: "accepted" | "rejected" }
 */
export const respondToCollaboratorRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    if (status !== "accepted" && status !== "rejected") {
      res.status(400).json({ success: false, message: "status must be 'accepted' or 'rejected'" });
      return;
    }

    const request = await quizService.getCollaboratorRequest(Number(quizId), Number(userId));
    if (!request) {
      res.status(404).json({ success: false, message: "Collaborator request not found" });
      return;
    }

    if (request.status === "accepted" && status === "accepted") {
      res.status(409).json({ success: false, message: "You are already a collaborator on this quiz" });
      return;
    }

    const updated = await quizService.updateCollaboratorRequest(Number(quizId), Number(userId), status);
    res.status(200).json({
      success: true,
      message: status === "accepted" ? "Collaborator request accepted" : "Collaborator request rejected",
      data: updated,
    });
  } catch (error) {
    console.error("Error responding to collaborator request:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while responding to collaborator request",
    });
  }
};

/**
 * DELETE /api/v1/user/quiz/:quizId/collaborators/:targetUserId
 * Owner removes an accepted collaborator or cancels a pending/rejected request.
 */
export const removeQuizCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId, targetUserId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    if (quiz.createdby !== Number(userId)) {
      res.status(403).json({ success: false, message: "Only the quiz owner can remove collaborators" });
      return;
    }

    const removed = await quizService.removeCollaborator(Number(quizId), Number(targetUserId));
    if (!removed) {
      res.status(404).json({ success: false, message: "No collaborator request found for this user" });
      return;
    }

    res.status(200).json({ success: true, message: "Collaborator removed" });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while removing collaborator",
    });
  }
};

// ==================== RESPONSES (ADMIN / COLLABORATOR) ====================

/**
 * GET /api/v1/user/quiz/:quizId/responses
 * Complete student response dashboard — owner or accepted collaborator only.
 */
export const getQuizResponses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const isOwner = quiz.createdby === Number(userId);
    const isCollaborator = await quizService.isAcceptedCollaborator(Number(userId), Number(quizId));
    if (!isOwner && !isCollaborator) {
      res.status(403).json({ success: false, message: "You are not authorized to view responses" });
      return;
    }

    await finalizeExpiredQuizAttempts({ quizId: Number(quizId) });
    const data = await quizService.getQuizResponses(Number(quizId));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz responses",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId/responses/:userId
 * Detailed result for a single student — owner or accepted collaborator only.
 * Includes question-wise review when an attempt exists.
 */
export const getStudentResponseDetail = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId, userId: targetUserId } = req.params;
    const requestedAttemptId = req.query.attemptId === undefined ? undefined : Number(req.query.attemptId);

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }

    const isOwner = quiz.createdby === Number(userId);
    const isCollaborator = await quizService.isAcceptedCollaborator(Number(userId), Number(quizId));
    if (!isOwner && !isCollaborator) {
      res.status(403).json({ success: false, message: "You are not authorized to view student responses" });
      return;
    }

    if (requestedAttemptId !== undefined && (!Number.isInteger(requestedAttemptId) || requestedAttemptId <= 0)) {
      res.status(400).json({ success: false, message: "Invalid attempt id" });
      return;
    }

    const attempt = await quizService.getStudentAttemptDetails(Number(quizId), Number(targetUserId), requestedAttemptId);
    if (!attempt) {
      res.status(404).json({ success: false, message: "No attempt found for this student" });
      return;
    }

    const review = await quizService.getStudentQuestionReview(attempt.attempt_id);
    res.status(200).json({ success: true, data: { attempt, review } });
  } catch (error) {
    console.error("Error fetching student response detail:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching student response detail",
    });
  }
};
// ==================== QUIZ PARTICIPANTS (audience allow-list) ====================

/**
 * PUT /api/v1/user/quiz/:quizId/participants
 * Body: { participants: [{ userId, name?, rollNumber?, source?, roomId?, allowed? }] }
 * Replaces the full participant list for the quiz.
 */
export const setQuizParticipants = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    const participants = req.body?.participants;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: "participants must be an array",
      });
    }

    // Owner-only: only the quiz creator may replace the participant list.
    const quiz = await quizService.getQuizById(String(quizId));
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    if (quiz.createdby !== Number(userId)) {
      return res.status(403).json({ success: false, message: "Only the quiz owner can modify participants" });
    }

    const saved = await quizService.replaceQuizParticipants(Number(quizId), participants);
    res.status(200).json({ success: true, data: { saved } });
  } catch (error) {
    console.error("Error saving quiz participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while saving quiz participants",
    });
  }
};

/**
 * GET /api/v1/user/quiz/:quizId/participants
 */
export const getQuizParticipantsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }
    const quiz = await quizService.getQuizById(String(quizId));
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    if (quiz.createdby !== Number(userId)) {
      return res.status(403).json({ success: false, message: "Only the quiz owner can view participants" });
    }
    const participants = await quizService.getQuizParticipants(quizId);
    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error("Error fetching quiz participants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching quiz participants",
    });
  }
};

// ==================== QUIZ GAME CONFIG ====================

/**
 * GET /api/v1/user/quiz/:quizId/game-config
 * Also served at /api/quizzes/:quizId/game-config
 * Returns persisted game config or defaults if none exists.
 * Auth required; follows existing quiz access rules (quiz must exist).
 */
export const getQuizGameConfig = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    // Read follows existing quiz access rules — any authenticated user who can view the quiz may read config.
    // Owner/collaborator check not required for reads, but quiz existence + auth is mandatory.
    const config = await quizService.getQuizGameConfig(Number(quizId));
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Error fetching quiz game config:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching game config" });
  }
};

/**
 * PUT /api/v1/user/quiz/:quizId/game-config
 * Upsert with validation. Only the quiz owner may write.
 */
export const upsertQuizGameConfig = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    const isOwner = quiz.createdby === Number(userId);
    if (!isOwner) {
      res.status(403).json({ success: false, message: "Only the quiz owner can update this quiz configuration" });
      return;
    }

    const {
      enabled,
      movementEnabled,
      movementSpeed,
      lives,
      pointsEnabled,
      powerupsEnabled,
      respawnEnabled,
      damageEnabled,
    } = req.body;

    // Strict type validation (middleware also validates via zod, double-check for direct calls)
    if (
      typeof enabled !== "boolean" ||
      typeof movementEnabled !== "boolean" ||
      typeof pointsEnabled !== "boolean" ||
      typeof powerupsEnabled !== "boolean" ||
      typeof respawnEnabled !== "boolean" ||
      typeof damageEnabled !== "boolean"
    ) {
      res.status(400).json({ success: false, message: "Boolean fields must be booleans" });
      return;
    }
    if (typeof movementSpeed !== "number" || !Number.isInteger(movementSpeed) || movementSpeed <= 0) {
      res.status(400).json({ success: false, message: "movementSpeed must be an integer > 0" });
      return;
    }
    if (typeof lives !== "number" || !Number.isInteger(lives) || lives < 0) {
      res.status(400).json({ success: false, message: "lives must be an integer >= 0" });
      return;
    }

    const config = await quizService.upsertQuizGameConfig(Number(quizId), {
      enabled,
      movementEnabled,
      movementSpeed,
      lives,
      pointsEnabled,
      powerupsEnabled,
      respawnEnabled,
      damageEnabled,
    });

    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    // DB constraint violations should not leak internals
    if (error?.code === "23514") {
      res.status(400).json({ success: false, message: "Invalid game config values" });
      return;
    }
    console.error("Error upserting quiz game config:", error);
    res.status(500).json({ success: false, message: "Internal server error while saving game config" });
  }
};

// ==================== GAME MECHANICS (lifelines/powerups per quiz) ====================

export const getAllGameMechanics = async (req: Request, res: Response) => {
  try {
    const mechanics = await quizService.getAllGameMechanics();
    res.status(200).json({ success: true, data: mechanics });
  } catch (error) {
    console.error("Error fetching all game mechanics:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching game mechanics" });
  }
};

export const getQuizGameMechanics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    const mechanics = await quizService.getQuizGameMechanics(Number(quizId));
    res.status(200).json({ success: true, data: mechanics });
  } catch (error) {
    console.error("Error fetching quiz game mechanics:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz game mechanics" });
  }
};

export const upsertQuizGameMechanics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { quizId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const quiz = await quizService.getQuizById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: "Quiz not found" });
      return;
    }
    const isOwner = quiz.createdby === Number(userId);
    if (!isOwner) {
      res.status(403).json({ success: false, message: "Only the quiz owner can update this quiz's game mechanics" });
      return;
    }

    const { mechanics } = req.body;
    if (!Array.isArray(mechanics)) {
      res.status(400).json({ success: false, message: "mechanics must be an array" });
      return;
    }

    for (const m of mechanics) {
      if (typeof m.mechanicCode !== "string" || typeof m.enabled !== "boolean" || typeof m.quantity !== "number") {
        res.status(400).json({ success: false, message: "Each mechanic must have mechanicCode (string), enabled (boolean), quantity (number)" });
        return;
      }
    }

    const result = await quizService.upsertQuizGameMechanics(Number(quizId), mechanics);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error upserting quiz game mechanics:", error);
    res.status(500).json({ success: false, message: "Internal server error while saving quiz game mechanics" });
  }
};
