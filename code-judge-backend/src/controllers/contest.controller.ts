// Contest controller. Provides CRUD operations for coding contests — list all, get by ID,
// get contest problems, register for contest, and get user's registered contests.
import type { Request, Response } from "express";
import { ContestService } from "../services/database/contest.service.ts";

const contestService = new ContestService();

/**
 * GET /api/v1/user/contest
 * Get all contests
 */
export const getAllContests = async (req: Request, res: Response) => {
  try {
    const contests = await contestService.getAllContests();
    res.status(200).json({
      success: true,
      data: contests,
    });
  } catch (error) {
    console.error("Error fetching contests:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching contests",
    });
  }
};

/**
 * GET /api/v1/user/contest/:contestId
 * Get a single contest by ID
 */
export const getContestById = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const contest = await contestService.getContestById(contestId);

    if (!contest) {
      res.status(404).json({
        success: false,
        message: "Contest not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: contest,
    });
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching contest",
    });
  }
};

/**
 * GET /api/v1/user/contest/:contestId/problems
 * Get all problems for a contest
 */
export const getContestProblems = async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    const problems = await contestService.getContestProblems(contestId);

    res.status(200).json({
      success: true,
      data: problems,
    });
  } catch (error) {
    console.error("Error fetching contest problems:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching contest problems",
    });
  }
};

/**
 * POST /api/v1/user/contest/register
 * Register the authenticated user for a contest
 * Body: { "rated": boolean }
 */
export const registerForContest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { rated } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const alreadyRegistered = await contestService.isUserRegistered(userId);
    if (alreadyRegistered) {
      res.status(409).json({
        success: false,
        message: "User is already registered for a contest",
      });
      return;
    }

    const registration = await contestService.registerUser(userId, rated || false);

    res.status(201).json({
      success: true,
      message: "Successfully registered for contest",
      data: registration,
    });
  } catch (error) {
    console.error("Error registering for contest:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while registering for contest",
    });
  }
};

/**
 * GET /api/v1/user/contest/my
 * Get the authenticated user's contest registrations
 */
export const getMyContests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const contests = await contestService.getUserContests(userId);

    res.status(200).json({
      success: true,
      data: contests,
    });
  } catch (error) {
    console.error("Error fetching user contests:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user contests",
    });
  }
};