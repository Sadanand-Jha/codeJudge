/**
 * ================================================================
 * Problems Service (Frontend)
 * ================================================================
 * 
 * CONNECTION FLOW:
 * 
 *   /problems (SSR page)
 *     → fetchProblems()
 *       → GET http://localhost:8000/api/problems      [env: NEXT_PUBLIC_API_URL]
 *       → Backend responds: { success: true, data: ProblemListItem[] }
 *       → Unwrap: return json.data
 *       → Props to <ProblemsLanding problems={ProblemListItem[]} />
 * 
 *   /problems/[problemId] (SSR page)
 *     → fetchProblem(problemId)
 *       → GET http://localhost:8000/api/problems/:problemId
 *       → Backend responds: { success: true, data: Problem }
 *       → Unwrap: return json.data
 *       → Props to <ProblemClient problem={Problem} />
 * 
 * BACKEND RESPONSE SHAPE:
 *   Success: { success: true, data: T }
 *   Error:   { success: false, message: string }
 * 
 * The fetch() calls work server-side (SSR in Next.js App Router),
 * so the API request happens on the server, not the browser.
 * ================================================================
 */

import type { Problem, ProblemListItem, ApiResponse } from "@/types/problem";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://quizbackend-dun.vercel.app/api";
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "");

export async function fetchProblem(problemId: string): Promise<Problem> {
  const response = await fetch(`${API_BASE}/problems/${problemId}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch problem: ${response.statusText}`);
  }

  const json: ApiResponse<Problem> = await response.json();

  if (!json.success) {
    throw new Error("Failed to fetch problem");
  }

  return json.data;
}

export async function fetchProblems(): Promise<ProblemListItem[]> {
  const response = await fetch(`${API_BASE}/problems`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch problems: ${response.statusText}`);
  }

  const json: ApiResponse<ProblemListItem[]> = await response.json();

  if (!json.success) {
    throw new Error("Failed to fetch problems");
  }

  return json.data;
}

/**
 * Client-side fresh fetch of the problems list (no `next` cache options — those
 * are server-only). Used by the Problems page to re-pull competitive programming
 * problems straight from the database when the user presses the CP spotlight.
 */
export async function fetchProblemsLive(): Promise<ProblemListItem[]> {
  const response = await fetch(`${API_BASE}/problems`);

  if (!response.ok) {
    throw new Error(`Failed to fetch problems: ${response.statusText}`);
  }

  const json: ApiResponse<ProblemListItem[]> = await response.json();

  if (!json.success) {
    throw new Error("Failed to fetch problems");
  }

  return json.data;
}