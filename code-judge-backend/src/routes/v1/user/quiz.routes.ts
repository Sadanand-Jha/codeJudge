import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import { validate, quizSchema, quizStatusSchema, quizRegistrationSchema, quizProblemSchema, quizProblemOptionSchema, reorderQuizProblemsSchema, saveQuizResponseSchema, cloneQuizSchema, joinQuizSchema } from "../../../middleware/validate.ts";
import {
  getAllQuizzes,
  getQuizById,
  getQuizByCode,
  getQuizProblemsController,
  registerForQuiz,
  getMyQuizzes,
  getMyCreatedQuizzes,
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
  getQuizDifficultyOptions,
  sendCollaboratorRequest,
  getQuizCollaborators,
  getMyCollaborations,
  getIncomingCollaboratorRequests,
  respondToCollaboratorRequest,
  removeQuizCollaborator,
  getQuizResponses,
  getStudentResponseDetail,
  setQuizParticipants,
  getQuizParticipantsController,
  generateQuizCodeEndpoint,
  saveQuizProblemFull,
} from "../../../controllers/quiz.controller.ts";
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
router.get("/my-quizzes", getMyCreatedQuizzes);

// GET /api/v1/user/quiz/code/:code — get a quiz by its code
router.get("/code/:code", getQuizByCode);

// GET /api/v1/user/quiz/visibility-options — get visibility options from quiz_visibility table
router.get("/visibility-options", getQuizVisibilityOptions);

// GET /api/v1/user/quiz/difficulty-options — get difficulty options from quiz_difficulty table
router.get("/difficulty-options", getQuizDifficultyOptions);

// GET /api/v1/user/quiz/generate-code — generate a unique 16-char quiz code
router.get("/generate-code", generateQuizCodeEndpoint);

// GET /api/v1/user/quiz/collaborator-requests/incoming — get the user's incoming collaborator requests
router.get("/collaborator-requests/incoming", getIncomingCollaboratorRequests);

// GET /api/v1/user/quiz/collaborations — get quizzes/projects the user collaborates on (creator + collaborator)
router.get("/collaborations", getMyCollaborations);

// PATCH /api/v1/user/quiz/collaborator-requests/:quizId — accept/reject an incoming request (recipient only)
router.patch("/collaborator-requests/:quizId", respondToCollaboratorRequest);

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

// POST /api/v1/user/quiz/problems/save-full — save a question with its options in one transaction
router.post("/problems/save-full", saveQuizProblemFull);

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

// GET /api/v1/user/quiz/:quizId/participants — audience allow-list (owner/collaborator)
router.get("/:quizId/participants", getQuizParticipantsController);
// PUT /api/v1/user/quiz/:quizId/participants — replace the participant list
router.put("/:quizId/participants", setQuizParticipants);

// ==================== JOIN QUIZ ====================

// POST /api/v1/user/quiz/register — register/join for a quiz
router.post("/register", validate(quizRegistrationSchema), registerForQuiz);

// POST /api/v1/user/quiz/join — join quiz by code or ID
router.post("/join", validate(joinQuizSchema), joinQuiz);





export default router;
