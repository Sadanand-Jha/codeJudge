import type { Request, Response } from "express";
import { pool } from "../app.ts";
import { QuizService } from "../services/database/quiz.service.ts";
import { ResultGenerationService } from "../services/resultGeneration.service.ts";
import { sendCollaboratorInviteEmail } from "../services/email.ts";

const quizService = new QuizService();
const resultGenerationService = new ResultGenerationService();

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

    res.status(200).json({
      success: true,
      data: quiz,
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
 * GET /api/v1/user/quiz/code/:code
 * Get a quiz by its code
 */
export const getQuizByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const quiz = await quizService.getQuizByCode(code);

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: quiz,
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
    const difficultyId = await resolveDifficultyId(body.difficulty);

    const calculatedTotal =
      body.totalMarks ??
      (body.marksPerQuestion ? body.marksPerQuestion * (body.totalQuestions || 0) : 0);
    const calculatedPassing =
      body.passingMarks ??
      (body.passingPercentage && calculatedTotal
        ? Math.ceil((calculatedTotal * body.passingPercentage) / 100)
        : 0);

    // DISCONNECTED FROM BACKEND - Example mock response for a quiz with children participants
    // const quiz = await quizService.createQuiz({
    //   name: body.name,
    //   code,
    //   createdby: Number(userId),
    //   starttime: body.starttime ? new Date(body.starttime) : undefined,
    //   endtime: body.endtime ? new Date(body.endtime) : undefined,
    //   visibility: visibilityId ?? undefined,
    //   difficulty: difficultyId ?? undefined,
    //   totalMarks: calculatedTotal,
    //   passingMarks: calculatedPassing,
    //   shuffleQuestions: body.randomizeQuestions,
    //   shuffleOptions: body.randomizeOptions,
    //   showResultsImmediately: body.showResultImmediately,
    //   negativeMarking: body.negativeMarking,
    //   leaderboard: true,
    //   status: "draft",
    // });

    // MOCK RESPONSE EXAMPLE - How it would look with children participants
    const mockQuiz = {
      id: 1,
      name: body.name || "Sample Quiz for Kids",
      code: code,
      createdby: Number(userId),
      starttime: body.starttime ? new Date(body.starttime) : new Date(Date.now() + 3600000),
      endtime: body.endtime ? new Date(body.endtime) : new Date(Date.now() + 7200000),
      visibility: visibilityId ?? 1,
      difficulty: difficultyId ?? 1,
      totalMarks: calculatedTotal || 50,
      passingMarks: calculatedPassing || 25,
      shuffleQuestions: body.randomizeQuestions || false,
      shuffleOptions: body.randomizeOptions || false,
      showResultsImmediately: body.showResultImmediately || false,
      negativeMarking: body.negativeMarking || false,
      leaderboard: true,
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Example: Children who participated
      participants: [
        { id: 101, username: "alice_smith", fullName: "Alice Smith", age: 8, rollno: "KIDS-001" },
        { id: 102, username: "bob_jones", fullName: "Bob Jones", age: 9, rollno: "KIDS-002" },
        { id: 103, username: "charlie_brown", fullName: "Charlie Brown", age: 7, rollno: "KIDS-003" },
        { id: 104, username: "diana_prince", fullName: "Diana Prince", age: 8, rollno: "KIDS-004" },
        { id: 105, username: "ethan_hunt", fullName: "Ethan Hunt", age: 9, rollno: "KIDS-005" }
      ],
      // Example: Results after participation
      results: [
        { userId: 101, score: 48, percentage: 96, correctAnswers: 48, wrongAnswers: 2, skippedQuestions: 0, rank: 1, completedAt: "2026-01-15T10:30:00Z" },
        { userId: 102, score: 42, percentage: 84, correctAnswers: 42, wrongAnswers: 8, skippedQuestions: 0, rank: 2, completedAt: "2026-01-15T10:35:00Z" },
        { userId: 103, score: 38, percentage: 76, correctAnswers: 38, wrongAnswers: 10, skippedQuestions: 2, rank: 3, completedAt: "2026-01-15T10:40:00Z" },
        { userId: 104, score: 35, percentage: 70, correctAnswers: 35, wrongAnswers: 12, skippedQuestions: 3, rank: 4, completedAt: "2026-01-15T10:42:00Z" },
        { userId: 105, score: 28, percentage: 56, correctAnswers: 28, wrongAnswers: 15, skippedQuestions: 7, rank: 5, completedAt: "2026-01-15T10:45:00Z" }
      ],
      // Example: Question-wise analytics
      analytics: {
        totalParticipants: 5,
        averageScore: 38.2,
        highestScore: 48,
        lowestScore: 28,
        passRate: 80,
        questionStats: [
          { questionId: 1, correctCount: 5, wrongCount: 0, skipCount: 0, difficulty: "easy" },
          { questionId: 2, correctCount: 4, wrongCount: 1, skipCount: 0, difficulty: "easy" },
          { questionId: 3, correctCount: 3, wrongCount: 2, skipCount: 0, difficulty: "medium" },
          { questionId: 4, correctCount: 2, wrongCount: 2, skipCount: 1, difficulty: "medium" },
          { questionId: 5, correctCount: 1, wrongCount: 3, skipCount: 1, difficulty: "hard" }
        ]
      }
    };

    res.status(201).json({
      success: true,
      message: "Quiz created successfully (MOCK - Backend disconnected)",
      data: mockQuiz,
    });
  } catch (error) {
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
    const { status } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const validStatuses = ["published", "unpublished", "draft", "archived"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: published, unpublished, draft, archived",
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
    const isCollaborator = await quizService.isAcceptedCollaborator(Number(userId), Number(quizId));
    if (!isOwner && !isCollaborator) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this quiz",
      });
      return;
    }

    const normalizedStatus = status === "unpublished" ? "draft" : status;

    const updatedQuiz = await quizService.updateQuiz(Number(quizId), { status: normalizedStatus });

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

    const problem = await quizService.getQuizProblems(String(problemId));
    const target = Array.isArray(problem) ? problem[0] : null;

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

    const problems = await quizService.getQuizProblems(problemId);
    const target = Array.isArray(problems) ? problems[0] : null;

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

    const problems = await quizService.getQuizProblems(problemId);
    const target = Array.isArray(problems) ? problems[0] : null;

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

    const problems = await quizService.getQuizProblems(problemId);
    const target = Array.isArray(problems) ? problems[0] : null;

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

    const access = await quizService.checkQuizAccess(Number(userId), Number(quizId));
    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason || "You are not allowed to access this quiz",
      });
      return;
    }

    if (access.reason === "resume") {
      const attempt = await quizService.getQuizAttempt(Number(userId), Number(quizId));
      return res.status(200).json({
        success: true,
        message: "Resuming existing quiz attempt",
        data: attempt,
      });
    }

    const problems = await quizService.getQuizProblems(quizId);
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
        attempt,
        problems,
      },
    });
  } catch (error) {
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
    const { problemId, option, textAnswer, timeTaken } = req.body;

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

    const response = await quizService.saveStudentResponse({
      userId: Number(userId),
      problemId: Number(problemId),
      option,
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
 * POST /api/v1/user/quiz/attempt/:attemptId/submit
 * Submit a quiz attempt with batch responses
 * Body: { responses: Array<{ problemId: number, option?: string, textAnswer?: string }> }
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

    const attempt = await quizService.getQuizAttempt(Number(userId), Number(attemptId));
    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Quiz attempt not found",
      });
      return;
    }

    if (attempt.status === "completed") {
      res.status(400).json({
        success: false,
        message: "Quiz already submitted",
      });
      return;
    }

    const problems = await quizService.getQuizProblems(String(attempt.quiz_id));
    const optionsMap = new Map<number, any[]>();
    for (const problem of problems) {
      const options = await quizService.getQuizProblemOptions(String(problem.id));
      optionsMap.set(problem.id, options);
    }

    const problemMap = new Map(problems.map(p => [p.id, p]));

    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = problems.length;

    const validResponses: Array<{ problemId: number; option?: string; textAnswer?: string }> = [];

    for (const response of responses) {
      const problemId = Number(response.problemId);
      const problem = problemMap.get(problemId);

      if (!problem) continue;

      const selectedOption = optionsMap.get(problemId)?.find((o) => o.id === Number(response.option));
      
      if (selectedOption) {
        skippedQuestions--;
        validResponses.push(response);
        
        if (selectedOption.iscorrect) {
          correctAnswers++;
          score += 1;
        } else {
          wrongAnswers++;
        }
      } else if (response.textAnswer) {
        skippedQuestions--;
        validResponses.push(response);
      }
    }

    const totalQuestions = problems.length;
    const percentage = totalQuestions > 0 ? parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;

    const updatedAttempt = await quizService.updateQuizAttempt(Number(attemptId), {
      status: "completed",
      completed_at: new Date(),
      score,
      percentage,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      skipped_questions: skippedQuestions,
    });

    res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      data: updatedAttempt,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while submitting quiz",
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
    const { quizId, rollno } = req.body;

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

    const alreadyRegistered = await quizService.isUserRegistered(userId, quizId);
    if (alreadyRegistered) {
      res.status(409).json({
        success: false,
        message: "User is already registered for this quiz",
      });
      return;
    }

    const registration = await quizService.registerUser(userId, quizId, rollno);

    res.status(201).json({
      success: true,
      message: "Successfully registered for quiz",
      data: registration,
    });
  } catch (error) {
    console.error("Error registering for quiz:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while registering for quiz",
    });
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

/**
 * GET /api/v1/user/quiz/:quizId/problems
 * Get all problems for a quiz
 */
export const getQuizProblemsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const problems = await quizService.getQuizProblems(quizId);

    const problemsWithOptions = await Promise.all(
      problems.map(async (problem: any) => {
        const options = await quizService.getQuizProblemOptions(String(problem.id));
        return { ...problem, options };
      })
    );

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
 * GET /api/v1/user/quiz/:quizId/register
 * Register for a quiz by code or ID
 */
export const joinQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code, quizId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    if (!code && !quizId) {
      res.status(400).json({
        success: false,
        message: "Either code or quizId is required",
      });
      return;
    }

    let quiz;
    if (code) {
      quiz = await quizService.getQuizByCode(code);
    } else {
      quiz = await quizService.getQuizById(quizId as string);
    }

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
      return;
    }

    const access = await quizService.checkQuizAccess(Number(userId), Number(quiz.id));
    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason || "You are not allowed to join this quiz",
      });
      return;
    }

    const registration = await quizService.registerUser(userId, String(quiz.id), "");

    res.status(200).json({
      success: true,
      message: "Successfully joined quiz",
      data: {
        quiz,
        registration,
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

    const attempt = await quizService.getStudentAttemptDetails(Number(quizId), Number(targetUserId));
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