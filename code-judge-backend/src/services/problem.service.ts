/**
 * ================================================================
 * Problem Service (Business Logic Layer)
 * ================================================================
 * 
 * FLOW:
 *   Controller → Service → Repository → PostgreSQL
 * 
 * getAllProblems():
 *   → Delegates to repository.getAllProblems()
 *   → Returns ProblemListItem[] for the list page
 *   → No business logic beyond delegation (simple query)
 * 
 * getProblemByProblemId(problemId):
 *   → Delegates to repository.getProblemByProblemId(problemId)
 *   → If repository returns null, throws NotFoundError
 *   → Controller catches NotFoundError and returns 404
 *   → Returns ProblemDetail if found
 * 
 * ================================================================
 */

import { ProblemRepository } from "../repositories/problem.repository.ts";
import type { ProblemListItem, ProblemDetail } from "../types/index.ts";
import { NotFoundError } from "../types/index.ts";

export class ProblemService {
  private repository: ProblemRepository;

  constructor() {
    this.repository = new ProblemRepository();
  }

  /**
   * Returns all problems (lightweight) for the problem list page.
   */
  async getAllProblems(): Promise<ProblemListItem[]> {
    return this.repository.getAllProblems();
  }

  /**
   * Returns full problem detail by problem_id.
   * Throws NotFoundError if the problem does not exist.
   */
  async getProblemByProblemId(problemId: string): Promise<ProblemDetail> {
    const problem = await this.repository.getProblemByProblemId(problemId);

    if (!problem) {
      throw new NotFoundError(`Problem with ID "${problemId}" not found`);
    }

    return problem;
  }
}