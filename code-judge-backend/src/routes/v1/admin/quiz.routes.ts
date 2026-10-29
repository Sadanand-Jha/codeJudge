// Admin quiz routes. Creator-facing quiz management lives here under /api/v1/admin/quiz.
import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  validate,
  quizSchema,
  quizUpdateSchema,
  quizStatusSchema,
  quizProblemSchema,
  quizProblemOptionSchema,
  reorderQuizProblemsSchema,
  cloneQuizSchema,
  quizGameConfigSchema,
  quizGameMechanicsSchema,
  secureQuizPayloadSchema,
  quizClientContentSchema,
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
  regenerateQuizCode,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  cloneQuiz,
  updateQuizStatus,
  getQuizProblemsController,
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
  getQuizResponses,
  getStudentResponseDetail,
  setQuizParticipants,
  getQuizParticipantsController,
  getQuizGameConfig,
  upsertQuizGameConfig,
  getAllGameMechanics,
  getQuizGameMechanics,
  upsertQuizGameMechanics,
  copyQuizCode,
  getCreatorProfileOverview,
} from "../../../controllers/adminQuizController.ts";
import {
  ackSecureQuizPayloadController,
  deleteSecureQuizPayloadController,
  getSecureQuizMetaController,
  getSecureQuizPayloadController,
  saveSecureQuizPayloadController,
  secureQuizNoStore,
} from "../../../controllers/secureQuiz.controller.ts";
import {
  getTeacherSecureContentController,
  saveTeacherSecureContentController,
} from "../../../controllers/quizCrypto.controller.ts";

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

// ==================== CREATOR PROFILE OVERVIEW ====================

router.get("/profile-overview", getCreatorProfileOverview);

// ==================== COPY / REGENERATE QUIZ CODE ====================

router.post("/:quizId/copy-code", copyQuizCode);
router.post("/:quizId/regenerate-code", regenerateQuizCode);

// ==================== ENCRYPTED QUIZ CONTENT ====================
// The browser encrypts before upload; these endpoints only receive ciphertext
// and a data key wrapped by the teacher's PDF key.

router.use("/:quizId/secure-payload", secureQuizNoStore);
router.get("/:quizId/secure-payload/meta", getSecureQuizMetaController);
router.get("/:quizId/secure-payload", getSecureQuizPayloadController);
router.post(
  "/:quizId/secure-payload",
  validate(secureQuizPayloadSchema),
  saveSecureQuizPayloadController
);
router.put(
  "/:quizId/secure-payload",
  validate(secureQuizPayloadSchema),
  saveSecureQuizPayloadController
);
router.post(
  "/:quizId/secure-payload/ack",
  ackSecureQuizPayloadController
);
router.delete("/:quizId/secure-payload", deleteSecureQuizPayloadController);

// ==================== CLIENT-ENCRYPTED CONTENT (v2) ====================
// Per-question ciphertext plus the DEK wrapped by the teacher's KEK. The
// server never receives question text, media references or explanations.
router.get(
  "/:quizId/client-crypto",
  secureQuizNoStore,
  getTeacherSecureContentController
);
router.put(
  "/:quizId/client-crypto",
  secureQuizNoStore,
  validate(quizClientContentSchema),
  saveTeacherSecureContentController
);

// ==================== QUIZ CRUD ====================

router.get("/:quizId", getAdminQuizById);
router.post("/", validate(quizSchema), createQuiz);
router.put("/:quizId", validate(quizUpdateSchema), updateQuiz);
router.delete("/:quizId", deleteQuiz);
router.patch("/:quizId/status", validate(quizStatusSchema), updateQuizStatus);
router.post("/:quizId/clone", validate(cloneQuizSchema), cloneQuiz);

// ==================== QUESTION MANAGEMENT ====================

router.get("/:quizId/problems", getQuizProblemsController);
router.post("/:quizId/problems", validate(quizProblemSchema), addQuizProblem);
router.post("/problems/save-full", saveQuizProblemFull);
router.put("/problems/:problemId", validate(quizProblemSchema), updateQuizProblem);
router.delete("/problems/:problemId", deleteQuizProblem);
router.post("/problems/:problemId/duplicate", duplicateQuizProblem);
router.put("/:quizId/reorder", validate(reorderQuizProblemsSchema), reorderQuizProblems);
router.post("/problems/:problemId/options", validate(quizProblemOptionSchema), addQuizProblemOption);

// ==================== GAME CONFIG ====================

router.get("/:quizId/game-config", getQuizGameConfig);
router.put("/:quizId/game-config", validate(quizGameConfigSchema), upsertQuizGameConfig);
router.get("/game-mechanics", getAllGameMechanics);
router.get("/:quizId/game-mechanics", getQuizGameMechanics);
router.put("/:quizId/game-mechanics", validate(quizGameMechanicsSchema), upsertQuizGameMechanics);

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
