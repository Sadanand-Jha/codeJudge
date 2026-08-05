import type { Request, Response } from "express";
import { QuizService } from "../services/database/quiz.service.ts";
import { ResultGenerationService } from "../services/resultGeneration.service.ts";

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
 * Create a new quiz
 */
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

    const quiz = await quizService.createQuiz({
      ...body,
      createdby: Number(userId),
    });

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
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

    if (quiz.createdby !== Number(userId)) {
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

const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await quizService.getAllSubjects();
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