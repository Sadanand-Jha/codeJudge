import apiClient from "@/lib/axios";

export interface Contest {
  id: number;
  name: string;
  starttime: string | null;
  duration: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContestProblem {
  id: number;
  problem_id: string;
  title: string;
  rating: number | null;
  problem_index: string | null;
  time_limit_ms: number;
  memory_limit_mb: number;
  source: string | null;
}

export interface ContestRegistration {
  id: number;
  user_id: number;
  is_registered: boolean;
  rated: boolean;
  createdat: string | null;
  updatedat: string | null;
}

/**
 * Get all contests
 * GET /api/v1/user/contest
 */
export async function getAllContests(): Promise<Contest[]> {
  const response = await apiClient.get<Contest[]>("/v1/user/contest");
  return response.data;
}

/**
 * Get a single contest by ID
 * GET /api/v1/user/contest/:contestId
 */
export async function getContestById(contestId: string): Promise<Contest> {
  const response = await apiClient.get<Contest>(`/v1/user/contest/${contestId}`);
  return response.data;
}

/**
 * Get all problems for a contest
 * GET /api/v1/user/contest/:contestId/problems
 */
export async function getContestProblems(contestId: string): Promise<ContestProblem[]> {
  const response = await apiClient.get<ContestProblem[]>(`/v1/user/contest/${contestId}/problems`);
  return response.data;
}

/**
 * Register for a contest
 * POST /api/v1/user/contest/register
 */
export async function registerForContest(rated: boolean = false): Promise<ContestRegistration> {
  const response = await apiClient.post<ContestRegistration>("/v1/user/contest/register", { rated });
  return response.data;
}

/**
 * Get user's contest registrations
 * GET /api/v1/user/contest/my
 */
export async function getMyContests(): Promise<Contest[]> {
  const response = await apiClient.get<Contest[]>("/v1/user/contest/my");
  return response.data;
}