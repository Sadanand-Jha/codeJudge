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
 *       → Props to <ProblemsList problems={ProblemListItem[]} />
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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