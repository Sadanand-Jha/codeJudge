import { Router } from "express";
import { authenticate } from "../../../middleware/auth.ts";
import {
  getAllQuizzes,
  getQuizById,
  getQuizByCode,
  getQuizProblems,
  registerForQuiz,
  getMyQuizzes,
  createQuiz,
} from "../../../controllers/quiz.controller.ts";

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

// GET /api/v1/user/quiz — get all quizzes
router.get("/", getAllQuizzes);

// GET /api/v1/user/quiz/my — get user's quiz registrations
router.get("/my", getMyQuizzes);

// GET /api/v1/user/quiz/code/:code — get a quiz by its code
router.get("/code/:code", getQuizByCode);

// GET /api/v1/user/quiz/:quizId — get a single quiz
router.get("/:quizId", getQuizById);

// GET /api/v1/user/quiz/:quizId/problems — get quiz problems
router.get("/:quizId/problems", getQuizProblems);

// POST /api/v1/user/quiz/register — register for a quiz
router.post("/register", registerForQuiz);

// POST /api/v1/user/quiz — create a new quiz
router.post("/", createQuiz);

export default router;