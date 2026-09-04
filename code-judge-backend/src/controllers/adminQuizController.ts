// Admin Quiz Controller — every handler enforces that the authenticated user
// is the quiz creator. This keeps the admin surface completely isolated from
// student-facing quiz logic.
import type { Request, Response } from "express";
import { pool } from "../app.ts";
import { AdminQuizService } from "../services/database/adminQuiz.service.ts";
import { ResultGenerationService } from "../services/resultGeneration.service.ts";
import { sendCollaboratorInviteEmail } from "../services/email.ts";

const quizService = new AdminQuizService();
const resultGenerationService = new ResultGenerationService();

// ==================== LOOKUP DATA ====================

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { search = "" } = req.query;
    const subjects = await quizService.getAllSubjects(search as string);
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching subjects" });
  }
};

export const getAllExamCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { search = "" } = req.query;
    const examCategories = await quizService.getAllExamCategories(search as string);
    res.status(200).json({ success: true, data: examCategories });
  } catch (error) {
    console.error("Error fetching exam categories:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching exam categories" });
  }
};

export const getQuizVisibilityOptions = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const result = await pool.query(
      "SELECT id, heading, description FROM quiz_visibility ORDER BY id ASC"
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching quiz visibility options:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz visibility options" });
  }
};

export const getQuizDifficultyOptions = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const result = await pool.query(
      "SELECT id, heading FROM quiz_difficulty ORDER BY id ASC"
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching quiz difficulty options:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz difficulty options" });
  }
};

// ==================== HELPERS ====================

/**
 * Fetch the authenticated user's numeric ID or return null.
 */
const getUserId = (req: Request): number | null => {
  const userId = req.user?.userId ? Number(req.user.userId) : null;
  return userId;
};

type QuizAccessResult =
  | { ok: true; quiz: any }
  | { ok: false; status: number; message: string };

/**
 * Assert the user is the quiz owner.
 * Returns a result object with quiz on success or error info on failure.
 */
const assertQuizAccess = async (
  quizId: string,
  userId: number
): Promise<QuizAccessResult> => {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) {
    return { ok: false, status: 404, message: "Quiz not found" };
  }

  if (quiz.createdby !== userId) {
    return { ok: false, status: 403, message: "You can only access your own quiz" };
  }

  return { ok: true, quiz };
};

/**
 * Assert the user is the quiz owner (stricter — used for destructive actions).
 */
const assertQuizOwnership = async (
  quizId: string,
  userId: number
): Promise<QuizAccessResult> => {
  const quiz = await quizService.getQuizById(quizId);
  if (!quiz) {
    return { ok: false, status: 404, message: "Quiz not found" };
  }

  if (quiz.createdby !== userId) {
    return { ok: false, status: 403, message: "You can only access your own quiz" };
  }

  return { ok: true, quiz };
};

// ==================== CREATOR QUIZ DASHBOARD ====================

export const getAllQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
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
      difficulty,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

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
    res.status(500).json({ success: false, message: "Internal server error while fetching quizzes" });
  }
};

export const getAdminQuizById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    res.status(200).json({ success: true, data: access.quiz });
  } catch (error) {
    console.error("Error fetching admin quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz" });
  }
};

export const getMyCreatedQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
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
    console.error("Error fetching my quizzes:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching my quizzes" });
  }
};

export const generateQuizCodeEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
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

// ==================== QUIZ CRUD ====================

const generateQuizCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

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
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const body = req.body;
    const code = body.code || generateQuizCode();
    const visibilityId = typeof body.visibility === "number" ? body.visibility : null;
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
      createdby: userId,
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

    res.status(201).json({ success: true, message: "Quiz created successfully", data: quiz });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while creating quiz" });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const updatedQuiz = await quizService.updateQuiz(Number(quizId), req.body);
    res.status(200).json({ success: true, message: "Quiz updated successfully", data: updatedQuiz });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while updating quiz" });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const deleted = await quizService.deleteQuiz(Number(quizId));
    if (!deleted) {
      res.status(404).json({ success: false, message: "Quiz not found or already deleted" });
      return;
    }

    res.status(200).json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while deleting quiz" });
  }
};

export const cloneQuiz = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, message: "name and code are required for cloning" });
      return;
    }

    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const clonedQuiz = await quizService.cloneQuiz(Number(quizId), name, code, userId);
    res.status(201).json({ success: true, message: "Quiz cloned successfully", data: clonedQuiz });
  } catch (error) {
    console.error("Error cloning quiz:", error);
    res.status(500).json({ success: false, message: "Internal server error while cloning quiz" });
  }
};

export const updateQuizStatus = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const { status } = req.body;

    const validStatuses = ["published", "unpublished", "draft", "archived"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: published, unpublished, draft, archived",
      });
      return;
    }

    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const normalizedStatus = status === "unpublished" ? "draft" : status;
    const updatedQuiz = await quizService.updateQuiz(Number(quizId), { status: normalizedStatus });

    res.status(200).json({ success: true, message: `Quiz ${status} successfully`, data: updatedQuiz });
  } catch (error) {
    console.error("Error updating quiz status:", error);
    res.status(500).json({ success: false, message: "Internal server error while updating quiz status" });
  }
};

// ==================== QUESTION MANAGEMENT ====================

export const getQuizProblemsController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const problems = await quizService.getQuizProblems(quizId);
    console.log(problems)
    const problemsWithOptions = await Promise.all(
      problems.map(async (problem: any) => {
        const options = await quizService.getQuizProblemOptions(String(problem.id));
        return { ...problem, options };
      })
    );

    res.status(200).json({ success: true, data: problemsWithOptions });
  } catch (error) {
    console.error("Error fetching quiz problems:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz problems" });
  }
};

export const getQuizProblemsPublicController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const problems = await quizService.getQuizProblems(quizId);
    const problemsWithOptions = await Promise.all(
      problems.map(async (problem: any) => {
        const options = await quizService.getQuizProblemOptions(String(problem.id));
        return {
          ...problem,
          options: options.map(({ iscorrect, ...option }: any) => option),
        };
      })
    );

    res.status(200).json({ success: true, data: problemsWithOptions });
  } catch (error) {
    console.error("Error fetching public quiz problems:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz problems" });
  }
};

export const addQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const MAX_PROBLEMS = 25;
    const problemCount = await quizService.getQuizProblemCount(String(quizId));
    if (problemCount >= MAX_PROBLEMS) {
      res.status(400).json({ success: false, message: `A quiz can have at most ${MAX_PROBLEMS} problems` });
      return;
    }

    const problem = await quizService.createQuizProblem({ ...req.body, quizId: Number(quizId) });
    res.status(201).json({ success: true, message: "Question added successfully", data: problem });
  } catch (error) {
    console.error("Error adding quiz problem:", error);
    res.status(500).json({ success: false, message: "Internal server error while adding question" });
  }
};

export const updateQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { problemId } = req.params;
    const target = await quizService.getQuizProblemById(problemId);
    if (!target) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const access = await assertQuizOwnership(String(target.quiz_id), userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const updatedProblem = await quizService.updateQuizProblem(Number(problemId), req.body);
    res.status(200).json({ success: true, message: "Question updated successfully", data: updatedProblem });
  } catch (error) {
    console.error("Error updating quiz problem:", error);
    res.status(500).json({ success: false, message: "Internal server error while updating question" });
  }
};

export const deleteQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { problemId } = req.params;
    const target = await quizService.getQuizProblemById(problemId);
    if (!target) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const access = await assertQuizOwnership(String(target.quiz_id), userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const deleted = await quizService.deleteQuizProblem(Number(problemId));
    if (!deleted) {
      res.status(404).json({ success: false, message: "Question not found or already deleted" });
      return;
    }

    res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz problem:", error);
    res.status(500).json({ success: false, message: "Internal server error while deleting question" });
  }
};

export const duplicateQuizProblem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { problemId } = req.params;
    const target = await quizService.getQuizProblemById(problemId);
    if (!target) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const access = await assertQuizOwnership(String(target.quiz_id), userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const duplicatedProblem = await quizService.duplicateQuizProblem(Number(problemId));
    res.status(201).json({ success: true, message: "Question duplicated successfully", data: duplicatedProblem });
  } catch (error) {
    console.error("Error duplicating quiz problem:", error);
    res.status(500).json({ success: false, message: "Internal server error while duplicating question" });
  }
};

export const reorderQuizProblems = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const { problemIds } = req.body;

    if (!Array.isArray(problemIds)) {
      res.status(400).json({ success: false, message: "problemIds must be an array" });
      return;
    }

    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    await quizService.reorderQuizProblems(Number(quizId), problemIds);
    res.status(200).json({ success: true, message: "Questions reordered successfully" });
  } catch (error) {
    console.error("Error reordering quiz problems:", error);
    res.status(500).json({ success: false, message: "Internal server error while reordering questions" });
  }
};

export const addQuizProblemOption = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { problemId } = req.params;
    const target = await quizService.getQuizProblemById(problemId);
    if (!target) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    const access = await assertQuizOwnership(String(target.quiz_id), userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const option = await quizService.createQuizProblemOption({
      ...req.body,
      problemId: Number(problemId),
    });
    res.status(201).json({ success: true, message: "Option added successfully", data: option });
  } catch (error) {
    console.error("Error adding quiz problem option:", error);
    res.status(500).json({ success: false, message: "Internal server error while adding option" });
  }
};

export const saveQuizProblemFull = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const body = req.body;
    const quizId = body.quizId;
    if (!quizId) {
      res.status(400).json({ success: false, message: "quizId is required" });
      return;
    }

    const access = await assertQuizOwnership(String(quizId), userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const MAX_PROBLEMS = 25;
    if (!body.problemId) {
      const problemCount = await quizService.getQuizProblemCount(String(quizId));
      if (problemCount >= MAX_PROBLEMS) {
        res.status(400).json({ success: false, message: `A quiz can have at most ${MAX_PROBLEMS} problems` });
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

    res.status(200).json({ success: true, message: "Question saved successfully", data: result });
  } catch (error) {
    console.error("Error saving quiz problem:", error);
    res.status(500).json({ success: false, message: "Internal server error while saving question" });
  }
};

// ==================== ANALYTICS + RESULTS ====================

export const getQuizAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const analytics = await quizService.getQuizAnalytics(Number(quizId));
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz analytics" });
  }
};

export const generateQuizResults = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const { force = false, sendEmail = true } = req.body;

    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
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
    res.status(500).json({ success: false, message: "Internal server error while generating quiz results" });
  }
};

export const retryQuizResultsEmail = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
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
    res.status(500).json({ success: false, message: "Internal server error while retrying quiz results email" });
  }
};

// ==================== COLLABORATORS ====================
// NOTE: quiz_collaborator_request table does not exist yet.
// All collaborator handlers are temporarily disabled.

// export const sendCollaboratorRequest = async (req: Request, res: Response) => {
//   ...
// };

// export const getQuizCollaborators = async (req: Request, res: Response) => {
//   ...
// };

// export const getMyCollaborations = async (req: Request, res: Response) => {
//   ...
// };

// export const getIncomingCollaboratorRequests = async (req: Request, res: Response) => {
//   ...
// };

// export const respondToCollaboratorRequest = async (req: Request, res: Response) => {
//   ...
// };

// export const removeQuizCollaborator = async (req: Request, res: Response) => {
//   ...
// };

// ==================== RESPONSES + PARTICIPANTS ====================

export const getQuizResponses = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const data = await quizService.getQuizResponses(Number(quizId));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz responses" });
  }
};

export const getStudentResponseDetail = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId, userId: targetUserId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
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
    res.status(500).json({ success: false, message: "Internal server error while fetching student response detail" });
  }
};

export const setQuizParticipants = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const participants = req.body?.participants;

    if (!Array.isArray(participants)) {
      res.status(400).json({ success: false, message: "participants must be an array" });
      return;
    }

    const access = await assertQuizOwnership(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const saved = await quizService.replaceQuizParticipants(Number(quizId), participants);
    res.status(200).json({ success: true, data: { saved } });
  } catch (error) {
    console.error("Error saving quiz participants:", error);
    res.status(500).json({ success: false, message: "Internal server error while saving quiz participants" });
  }
};

export const getQuizParticipantsController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const participants = await quizService.getQuizParticipants(quizId);
    res.status(200).json({ success: true, data: participants });
  } catch (error) {
    console.error("Error fetching quiz participants:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching quiz participants" });
  }
};

// ==================== GAME CONFIG ====================

export const getQuizGameConfig = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const config = await quizService.getQuizGameConfig(Number(quizId));
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Error fetching quiz game config:", error);
    res.status(500).json({ success: false, message: "Internal server error while fetching game config" });
  }
};

export const upsertQuizGameConfig = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
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
    if (error?.code === "23514") {
      res.status(400).json({ success: false, message: "Invalid game config values" });
      return;
    }
    console.error("Error upserting quiz game config:", error);
    res.status(500).json({ success: false, message: "Internal server error while saving game config" });
  }
};

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
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
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
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const { mechanics } = req.body;
    if (!Array.isArray(mechanics)) {
      res.status(400).json({ success: false, message: "mechanics must be an array" });
      return;
    }

    for (const m of mechanics) {
      if (typeof m.mechanicCode !== "string" || typeof m.enabled !== "boolean" || typeof m.quantity !== "number") {
        res.status(400).json({
          success: false,
          message: "Each mechanic must have mechanicCode (string), enabled (boolean), quantity (number)",
        });
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

// ==================== COPY QUIZ CODE ====================

export const copyQuizCode = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return;

    const { quizId } = req.params;
    const access = await assertQuizAccess(quizId, userId);
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    res.status(200).json({ success: true, data: { code: access.quiz.code } });
  } catch (error) {
    console.error("Error copying quiz code:", error);
    res.status(500).json({ success: false, message: "Internal server error while copying quiz code" });
  }
};
