// Admin quiz routes. Creator-facing quiz management lives here under /api/v1/admin/quiz.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  validate,
  quizSchema,
  quizStatusSchema,
  quizProblemSchema,
  quizProblemOptionSchema,
  reorderQuizProblemsSchema,
  cloneQuizSchema,
  quizGameConfigSchema,
  quizGameMechanicsSchema,
} from "../../../middleware/validate.ts";
import {
  getAllQuizzes,
  getAdminQuizById,
  getMyCreatedQuizzes,
  getAllSubjects,
  getAllExamCategories,
  getQuizVisibilityOptions,
  getQuizDifficultyOptions,
  generateQuizCodeEndpoint,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  updateQuizStatus,
  getQuizProblemsController,
  getQuizProblemsPublicController,
  addQuizProblem,
  updateQuizProblem,
  deleteQuizProblem,
  duplicateQuizProblem,
  reorderQuizProblems,
  addQuizProblemOption,
  saveQuizProblemFull,
  getQuizAnalytics,
  generateQuizResults,
  retryQuizResultsEmail,
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
  getQuizGameConfig,
  upsertQuizGameConfig,
  getAllGameMechanics,
  getQuizGameMechanics,
  upsertQuizGameMechanics,
} from "../../../controllers/quiz.controller.ts";

const router = Router();

router.use(authenticate);

// ==================== CREATOR QUIZ DASHBOARD ====================

router.get("/", getAllQuizzes);
router.get("/my-quizzes", getMyCreatedQuizzes);
router.get("/subjects", getAllSubjects);
router.get("/exam-categories", getAllExamCategories);
router.get("/visibility-options", getQuizVisibilityOptions);
router.get("/difficulty-options", getQuizDifficultyOptions);
router.get("/generate-code", generateQuizCodeEndpoint);

// ==================== QUIZ CRUD ====================

router.get("/:quizId", getAdminQuizById); // checked
router.post("/", validate(quizSchema), createQuiz);
router.put("/:quizId", validate(quizSchema), updateQuiz);
router.delete("/:quizId", deleteQuiz);
router.patch("/:quizId/status", validate(quizStatusSchema), updateQuizStatus);
router.post("/:quizId/clone", validate(cloneQuizSchema), cloneQuiz);

// ==================== QUESTION MANAGEMENT ====================

router.get("/:quizId/problems", getQuizProblemsController);
router.get("/:quizId/problems/public", getQuizProblemsPublicController);
router.post("/:quizId/problems", validate(quizProblemSchema), addQuizProblem);
router.post("/problems/save-full", saveQuizProblemFull);
router.put("/problems/:problemId", validate(quizProblemSchema), updateQuizProblem);
router.delete("/problems/:problemId", deleteQuizProblem);
router.post("/problems/:problemId/duplicate", duplicateQuizProblem);
router.put("/:quizId/reorder", validate(reorderQuizProblemsSchema), reorderQuizProblems);
router.post("/problems/:problemId/options", validate(quizProblemOptionSchema), addQuizProblemOption);

// ==================== GAME + ACCESS CONFIG ====================

router.get("/:quizId/game-config", getQuizGameConfig);
router.put("/:quizId/game-config", validate(quizGameConfigSchema), upsertQuizGameConfig);
router.get("/game-mechanics", getAllGameMechanics);
router.get("/:quizId/game-mechanics", getQuizGameMechanics);
router.put("/:quizId/game-mechanics", validate(quizGameMechanicsSchema), upsertQuizGameMechanics);

// ==================== COLLABORATORS ====================

router.post("/:quizId/collaborators/request", sendCollaboratorRequest);
router.get("/:quizId/collaborators", getQuizCollaborators);
router.delete("/:quizId/collaborators/:targetUserId", removeQuizCollaborator);
router.get("/collaborations", getMyCollaborations);
router.get("/collaborator-requests/incoming", getIncomingCollaboratorRequests);
router.patch("/collaborator-requests/:quizId", respondToCollaboratorRequest);

// ==================== RESPONSES + PARTICIPANTS ====================

router.get("/:quizId/responses", getQuizResponses);
router.get("/:quizId/responses/:userId", getStudentResponseDetail);
router.get("/:quizId/participants", getQuizParticipantsController);
router.put("/:quizId/participants", setQuizParticipants);

// ==================== ANALYTICS + RESULTS ====================

router.get("/:quizId/analytics", getQuizAnalytics);
router.post("/:quizId/generate-results", generateQuizResults);
router.post("/:quizId/retry-email", retryQuizResultsEmail);


export default router;