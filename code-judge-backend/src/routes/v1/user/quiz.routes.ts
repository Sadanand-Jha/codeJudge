import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import { validate, quizSchema, quizStatusSchema, quizRegistrationSchema, quizProblemSchema, quizProblemOptionSchema, reorderQuizProblemsSchema, saveQuizResponseSchema, cloneQuizSchema, joinQuizSchema } from "../../../middleware/validate.ts";
import {
  getAllQuizzes,
  getQuizById,
  getQuizByCode,
  getQuizProblemsController,
  registerForQuiz,
  getMyQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  updateQuizStatus,
  addQuizProblem,
  updateQuizProblem,
  deleteQuizProblem,
  duplicateQuizProblem,
  reorderQuizProblems,
  addQuizProblemOption,
  startQuizAttempt,
  saveQuizResponse,
  submitQuizAttempt,
  getQuizResult,
  getQuizReview,
  getQuizLeaderboard,
  getQuizAnalytics,
  joinQuiz,
  getPreviousQuizzes,
  generateQuizResults,
  retryQuizResultsEmail,
  getAllSubjects,
  getQuizVisibilityOptions,
  sendCollaboratorRequest,
  getQuizCollaborators,
  getIncomingCollaboratorRequests,
  getMyCollaborations,
  respondToCollaboratorRequest,
  removeQuizCollaborator,
  getQuizResponses,
  getStudentResponseDetail
} from "../../../controllers/quiz.controller.ts";
import { QuizService } from "../../../services/database/quiz.service.ts";

const quizService = new QuizService();

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

// ==================== QUIZ SETTINGS ====================

// GET /api/v1/user/quiz — get all quizzes (with filters, search, sorting, pagination)
router.get("/", getAllQuizzes);

// GET /api/v1/user/quiz/my — get user's quiz registrations
router.get("/my", getMyQuizzes);

// GET /api/v1/user/quiz/previous — get previous quizzes (attempted by student)
router.get("/previous", getPreviousQuizzes);

// GET /api/v1/user/quiz/old-quizzes — get quizzes participated by current user
router.get("/old-quizzes", getPreviousQuizzes);

// ==================== MY CREATED QUIZZES ====================

/**
 * GET /api/v1/user/quiz/my-quizzes
 * Get quizzes created by the authenticated user
 */
router.get("/my-quizzes", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
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
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching my quizzes",
    });
  }
});

// GET /api/v1/user/quiz/code/:code — get a quiz by its code
router.get("/code/:code", getQuizByCode);

// GET /api/v1/user/quiz/visibility-options — get visibility options from quiz_visibility table
router.get("/visibility-options", getQuizVisibilityOptions);

// GET /api/v1/user/quiz/collaborator-requests/incoming — get the user's incoming collaborator requests
router.get("/collaborator-requests/incoming", getIncomingCollaboratorRequests);

// PATCH /api/v1/user/quiz/collaborator-requests/:quizId — accept/reject an incoming request (recipient only)
router.patch("/collaborator-requests/:quizId", respondToCollaboratorRequest);

// GET /api/v1/user/quiz/collaborations — quizzes where the user is an ACCEPTED collaborator
router.get("/collaborations", getMyCollaborations);

// GET /api/v1/user/quiz/:quizId — get a single quiz
router.get("/:quizId", getQuizById);

// POST /api/v1/user/quiz — create a new quiz
router.post("/", validate(quizSchema), createQuiz);

// PUT /api/v1/user/quiz/:quizId — update a quiz
router.put("/:quizId", validate(quizSchema), updateQuiz);

// DELETE /api/v1/user/quiz/:quizId — delete a quiz
router.delete("/:quizId", deleteQuiz);

// PATCH /api/v1/user/quiz/:quizId/status — update quiz status (publish/unpublish/draft/archive)
router.patch("/:quizId/status", validate(quizStatusSchema), updateQuizStatus);

// ==================== QUESTION MANAGEMENT ====================

// GET /api/v1/user/quiz/:quizId/problems — get quiz problems
router.get("/:quizId/problems", getQuizProblemsController);

// POST /api/v1/user/quiz/:quizId/problems — add a question
router.post("/:quizId/problems", validate(quizProblemSchema), addQuizProblem);

// PUT /api/v1/user/quiz/problems/:problemId — update a question
router.put("/problems/:problemId", validate(quizProblemSchema), updateQuizProblem);

// DELETE /api/v1/user/quiz/problems/:problemId — delete a question
router.delete("/problems/:problemId", deleteQuizProblem);

// POST /api/v1/user/quiz/problems/:problemId/duplicate — duplicate a question
router.post("/problems/:problemId/duplicate", duplicateQuizProblem);

// POST /api/v1/user/quiz/:quizId/clone — clone a quiz
router.post("/:quizId/clone", validate(cloneQuizSchema), cloneQuiz);

// PUT /api/v1/user/quiz/:quizId/reorder — reorder questions
router.put("/:quizId/reorder", validate(reorderQuizProblemsSchema), reorderQuizProblems);

// POST /api/v1/user/quiz/problems/:problemId/options — add an option
router.post("/problems/:problemId/options", validate(quizProblemOptionSchema), addQuizProblemOption);

// ==================== QUIZ ATTEMPT ====================

// POST /api/v1/user/quiz/:quizId/start — start a quiz attempt
router.post("/:quizId/start", startQuizAttempt);

// POST /api/v1/user/quiz/attempt/:attemptId/save — autosave answers
router.post("/attempt/:attemptId/save", validate(saveQuizResponseSchema), saveQuizResponse);

// POST /api/v1/user/quiz/attempt/:attemptId/submit — submit a quiz
router.post("/attempt/:attemptId/submit", submitQuizAttempt);

// ==================== RESULTS & REVIEW ====================

// GET /api/v1/user/quiz/result/:attemptId — get quiz result
router.get("/result/:attemptId", getQuizResult);

// GET /api/v1/user/quiz/result/:attemptId/review — get question-wise review
router.get("/result/:attemptId/review", getQuizReview);

// ==================== RESULT GENERATION ====================

// POST /api/v1/user/quiz/:quizId/generate-results — manually generate results
router.post("/:quizId/generate-results", generateQuizResults);

// POST /api/v1/user/quiz/:quizId/retry-email — retry sending marksheet email
router.post("/:quizId/retry-email", retryQuizResultsEmail);

// ==================== LEADERBOARD ====================

// GET /api/v1/user/quiz/:quizId/leaderboard — get quiz leaderboard
router.get("/:quizId/leaderboard", getQuizLeaderboard);

// ==================== ANALYTICS ====================

// GET /api/v1/user/quiz/:quizId/analytics — get quiz analytics
router.get("/:quizId/analytics", getQuizAnalytics);

// ==================== COLLABORATORS ====================

// POST /api/v1/user/quiz/:quizId/collaborators/request — send a collaborator request (owner only)
router.post("/:quizId/collaborators/request", sendCollaboratorRequest);

// GET /api/v1/user/quiz/:quizId/collaborators — get requests + accepted collaborators (owner/collaborator)
router.get("/:quizId/collaborators", getQuizCollaborators);

// DELETE /api/v1/user/quiz/:quizId/collaborators/:targetUserId — owner removes collaborator / cancels request
router.delete("/:quizId/collaborators/:targetUserId", removeQuizCollaborator);

// ==================== RESPONSES (admin view) ====================

// GET /api/v1/user/quiz/:quizId/responses — complete response dashboard (owner/collaborator)
router.get("/:quizId/responses", getQuizResponses);

// GET /api/v1/user/quiz/:quizId/responses/:userId — single student detail (owner/collaborator)
router.get("/:quizId/responses/:userId", getStudentResponseDetail);

// ==================== JOIN QUIZ ====================

// POST /api/v1/user/quiz/register — register/join for a quiz
router.post("/register", validate(quizRegistrationSchema), registerForQuiz);

// POST /api/v1/user/quiz/join — join quiz by code or ID
router.post("/join", validate(joinQuizSchema), joinQuiz);





export default router;
