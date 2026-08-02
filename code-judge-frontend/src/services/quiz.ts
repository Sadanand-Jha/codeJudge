import apiClient from "@/lib/axios";
import { isValidQuizCode } from "@/utils/quizCode";

export interface Quiz {
  id: number;
  name: string;
  code: string;
  createdby: number;
  starttime: string | null;
  endtime: string | null;
  created_at: string | null;
  updated_at: string | null;
  creator_name: string | null;
}

/**
 * Get quiz code from an identifier (code or numeric id fallback)
 */
export function getQuizCode(idOrCode: string): string {
  if (isValidQuizCode(idOrCode)) return idOrCode.toUpperCase();
  return idOrCode;
}

/**
 * Build internal quiz route path using code
 */
export function quizCodePath(code: string, subpath = ""): string {
  const c = getQuizCode(code);
  return subpath ? `/quiz/${c}/${subpath}` : `/quiz/${c}`;
}

export interface QuizProblem {
  id: number;
  quiz_id: number;
  problem_statement: string;
  problem_description: string | null;
  quiz_problem_type: number | null;
  problem_type_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  options: QuizProblemOption[];
}

export interface QuizProblemOption {
  id: number;
  problem_id: number;
  option_statement: string;
  option_description: string | null;
  iscorrect: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuizRegistration {
  id: number;
  user_id: number;
  quiz_id: number;
  is_registered: boolean;
  rollno: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get all quizzes
 * GET /api/v1/user/quiz
 */
export async function getAllQuizzes(): Promise<Quiz[]> {
  const response = await apiClient.get<Quiz[]>("/v1/user/quiz");
  return response.data;
}

/**
 * Get a single quiz by ID
 * GET /api/v1/user/quiz/:quizId
 */
export async function getQuizById(quizId: string): Promise<Quiz> {
  const response = await apiClient.get<Quiz>(`/v1/user/quiz/${quizId}`);
  return response.data;
}

/**
 * Get a quiz by its code
 * GET /api/v1/user/quiz/code/:code
 */
export async function getQuizByCode(code: string): Promise<Quiz> {
  const response = await apiClient.get<Quiz>(`/v1/user/quiz/code/${code}`);
  return response.data;
}

/**
 * Get all problems for a quiz
 * GET /api/v1/user/quiz/:quizId/problems
 */
export async function getQuizProblems(quizId: string): Promise<QuizProblem[]> {
  const response = await apiClient.get<QuizProblem[]>(`/v1/user/quiz/${quizId}/problems`);
  return response.data;
}

/**
 * Register for a quiz
 * POST /api/v1/user/quiz/register
 */
export async function registerForQuiz(quizId: string, rollno?: string): Promise<QuizRegistration> {
  const response = await apiClient.post<QuizRegistration>("/v1/user/quiz/register", { quizId, rollno });
  return response.data;
}

/**
 * Get user's quiz registrations
 * GET /api/v1/user/quiz/my
 */
export async function getMyQuizzes(): Promise<Quiz[]> {
  const response = await apiClient.get<Quiz[]>("/v1/user/quiz/my");
  return response.data;
}

/**
 * Create a new quiz
 * POST /api/v1/user/quiz
 */
export async function createQuiz(data: {
  name: string;
  code: string;
  starttime?: string;
  endtime?: string;
}): Promise<Quiz> {
  const response = await apiClient.post<Quiz>("/v1/user/quiz", data);
  return response.data;
}