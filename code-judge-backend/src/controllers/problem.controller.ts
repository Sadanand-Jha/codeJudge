/**
 * ================================================================
 * Problem Controller
 * ================================================================
 * 
 * FLOW:
 *   Route → Controller → Service → Repository → PostgreSQL
 * 
 * getAllProblems:
 *   GET /api/problems
 *   → problemService.getAllProblems()
 *   → repository.getAllProblems()  [SQL: SELECT + LEFT JOIN tags]
 *   → Returns: { success: true, data: ProblemListItem[] }
 * 
 * getProblemByProblemId:
 *   GET /api/problems/:problemId
 *   → problemService.getProblemByProblemId(problemId)
 *   → repository.getProblemByProblemId(problemId)  [SQL: SELECT + JOIN tags + sample_testcases]
 *   → If null: throws NotFoundError → 404 response
 *   → Returns: { success: true, data: ProblemDetail }
 * 
 * RESPONSE ENVELOPE:
 *   All successful responses: { success: true, data: T }
 *   Validation errors:        { success: false, message: string }  (400)
 *   Not found errors:         { success: false, message: string }  (404)
 *   Unexpected errors:        forwarded to global errorHandler middleware
 * 
 * ================================================================
 */

import type { Request, Response, NextFunction } from "express";
import { ProblemService } from "../services/database/problem.service.ts";
import { NotFoundError } from "../types/index.ts";

const problemService = new ProblemService();

/**
 * GET /api/problems
 *
 * Returns all problems (lightweight) for the Problems page.
 * Response shape: { success: true, data: ProblemListItem[] }
 */
export async function getAllProblems(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const problems = await problemService.getAllProblems();

    res.status(200).json({
      success: true,
      data: problems,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/problems/:problemId
 *
 * Returns the full detail of a single problem by its problem_id (e.g. "2242B").
 * Response shape: { success: true, data: ProblemDetail }
 */
export async function getProblemByProblemId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { problemId } = req.params;

    // Validate that problemId is provided
    if (!problemId || typeof problemId !== "string" || problemId.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Invalid problem ID",
      });
      return;
    }

    const problem = await problemService.getProblemByProblemId(problemId.trim());

    res.status(200).json({
      success: true,
      data: problem,
    });
  } catch (error) {
    // If the service threw a NotFoundError, return 404
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
}