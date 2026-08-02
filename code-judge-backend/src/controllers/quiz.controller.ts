import type { Request, Response } from "express";
import { QuizService } from "../services/database/quiz.service.ts";

const quizService = new QuizService();

/**
 * GET /api/v1/user/quiz
 * Get all quizzes
 */
export const getAllQuizzes = async (req: Request, res: Response) => {
  try {
    const quizzes = await quizService.getAllQuizzes();
    res.status(200).json({
      success: true,
      data: quizzes,
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
 * GET /api/v1/user/quiz/:quizId/problems
 * Get all problems for a quiz
 */
export const getQuizProblems = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const problems = await quizService.getQuizProblems(quizId);

    // Fetch options for each problem
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
 * POST /api/v1/user/quiz
 * Create a new quiz
 * Body: { "name": string, "code": string, "starttime": string, "endtime": string }
 */
export const createQuiz = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, code, starttime, endtime } = req.body;

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
        message: "name and code are required",
      });
      return;
    }

    if (code.length < 16) {
      res.status(400).json({
        success: false,
        message: "Quiz code must be at least 16 characters long",
      });
      return;
    }

    const quiz = await quizService.createQuiz({
      name,
      code,
      createdby: Number(userId),
      starttime: starttime ? new Date(starttime) : undefined,
      endtime: endtime ? new Date(endtime) : undefined,
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