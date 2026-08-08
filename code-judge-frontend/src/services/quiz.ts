import apiClient from "@/lib/axios";
import { isValidQuizCode } from "@/utils/quizCode";
import { QuizLeaderboardSettings } from "@/types/quiz";

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

export interface QuizVisibilityOption {
  id: number;
  heading: string;
  description: string | null;
}

/**
 * Get visibility options from the `quiz_visibility` DB table
 * GET /api/v1/user/quiz/visibility-options
 */
export async function getQuizVisibilityOptions(): Promise<QuizVisibilityOption[]> {
  const response = await apiClient.get<QuizVisibilityOption[]>("/v1/user/quiz/visibility-options");
  return response.data;
}

export interface CreateQuizPayload {
  name: string;
  description?: string;
  subject?: string;
  topic?: string;
  code: string;
  difficulty?: string;
  visibility?: number;
  timeLimit?: number;
  starttime?: string;
  endtime?: string;
  timeZone?: string;
  maxParticipants?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  showResultImmediately?: boolean;
  showCorrectAnswersAfterSubmission?: boolean;
  negativeMarking?: boolean;
  negativeMarkValue?: number;
  marksPerQuestion?: number;
  totalQuestions?: number;
  totalMarks?: number;
  passingPercentage?: number;
  passingMarks?: number;
  tags?: string[];
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

export interface QuizSubject {
  id: number;
  subject_name: string;
}

/**
 * Get all quiz subjects
 * GET /api/v1/user/quiz/quiz-subjects
 */
export async function getAllSubjects(search?: string, signal?: AbortSignal): Promise<QuizSubject[]> {
  const params = search ? { search } : undefined;
  const response = await apiClient.get<QuizSubject[]>("/v1/user/quiz-subjects", { params, signal });
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
 * Get quizzes created by the current user
 * GET /api/v1/user/quiz/my-quizzes
 */
export async function getMyCreatedQuizzes(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  visibility?: number;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{ quizzes: Quiz[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await apiClient.get("/v1/user/quiz/my-quizzes", { params });
  // After interceptor, response.data is the quizzes array
  const quizzes = (response.data || []) as Quiz[];
  // Pagination info is preserved by the interceptor as response.pagination
  const pagination = (response as any).pagination;
  const limitVal = params.limit || 10;
  const pageVal = params.page || 1;
  const total = pagination?.total || quizzes.length;
  const totalPages = pagination?.totalPages || Math.ceil(total / limitVal);
  return {
    quizzes,
    pagination: {
      page: pageVal,
      limit: limitVal,
      total,
      totalPages,
    },
  };
}

/**
 * Get old quizzes (quizzes participated by current user)
 * GET /api/v1/user/quiz/old-quizzes
 */
export async function getOldQuizzes(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{ quizzes: PreviousQuiz[]; total: number }> {
  const response = await apiClient.get("/v1/user/quiz/old-quizzes", { params });
  // After interceptor, response.data is the quizzes array
  const quizzes = (response.data || []) as PreviousQuiz[];
  return { quizzes, total: quizzes.length };
}

/**
 * Create a new quiz from the creator settings form
 * POST /api/v1/user/quiz
 */
export async function createQuiz(data: CreateQuizPayload): Promise<Quiz> {
  const response = await apiClient.post<Quiz>("/v1/user/quiz", data);
  return response.data;
}

/**
 * Update a quiz
 * PUT /api/v1/user/quiz/:quizId
 */
export async function updateQuiz(quizId: string, data: Partial<{
  name: string;
  code: string;
  starttime: string;
  endtime: string;
  visibility: number;
  difficulty: number;
  totalMarks: number;
  passingMarks: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  negativeMarking: boolean;
  leaderboard: boolean;
}>): Promise<Quiz> {
  const response = await apiClient.put<Quiz>(`/v1/user/quiz/${quizId}`, data);
  return response.data;
}

/**
 * Delete a quiz
 * DELETE /api/v1/user/quiz/:quizId
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  await apiClient.delete(`/v1/user/quiz/${quizId}`);
}

/**
 * Clone a quiz
 * POST /api/v1/user/quiz/:quizId/clone
 */
export async function cloneQuiz(quizId: string, data: {
  name: string;
  code: string;
}): Promise<Quiz> {
  const response = await apiClient.post<Quiz>(`/v1/user/quiz/${quizId}/clone`, data);
  return response.data;
}

/**
 * Update quiz status (publish/unpublish/draft/archive)
 * PATCH /api/v1/user/quiz/:quizId/status
 */
export async function updateQuizStatus(quizId: string, status: "published" | "unpublished" | "draft" | "archived"): Promise<Quiz> {
  const response = await apiClient.patch<Quiz>(`/v1/user/quiz/${quizId}/status`, { status });
  return response.data;
}

// ─────────────────────────────────────────
// Quiz Question Management API
// ─────────────────────────────────────────

export interface QuizProblemCreate {
  problem_statement: string;
  problem_description?: string;
  quiz_problem_type?: number;
  question_number?: number;
  explanation?: string;
  hint?: string;
  difficulty?: number;
  reference_notes?: string;
  internal_comments?: string;
}

export interface QuizProblemOptionCreate {
  option_statement: string;
  option_description?: string;
  isCorrect: boolean;
}

/**
 * Add a question to a quiz
 * POST /api/v1/user/quiz/:quizId/problems
 */
export async function addQuizProblem(quizId: string, data: QuizProblemCreate): Promise<QuizProblem> {
  const response = await apiClient.post<QuizProblem>(`/v1/user/quiz/${quizId}/problems`, data);
  return response.data;
}

/**
 * Update a quiz question
 * PUT /api/v1/user/quiz/problems/:problemId
 */
export async function updateQuizProblem(problemId: string, data: QuizProblemCreate): Promise<QuizProblem> {
  const response = await apiClient.put<QuizProblem>(`/v1/user/quiz/problems/${problemId}`, data);
  return response.data;
}

/**
 * Delete a quiz question
 * DELETE /api/v1/user/quiz/problems/:problemId
 */
export async function deleteQuizProblem(problemId: string): Promise<void> {
  await apiClient.delete(`/v1/user/quiz/problems/${problemId}`);
}

/**
 * Duplicate a quiz question
 * POST /api/v1/user/quiz/problems/:problemId/duplicate
 */
export async function duplicateQuizProblem(problemId: string): Promise<QuizProblem> {
  const response = await apiClient.post<QuizProblem>(`/v1/user/quiz/problems/${problemId}/duplicate`, {});
  return response.data;
}

/**
 * Reorder quiz questions
 * PUT /api/v1/user/quiz/:quizId/reorder
 */
export async function reorderQuizProblems(quizId: string, problemIds: number[]): Promise<void> {
  await apiClient.put(`/v1/user/quiz/${quizId}/reorder`, { problemIds });
}

/**
 * Add an option to a quiz question
 * POST /api/v1/user/quiz/problems/:problemId/options
 */
export async function addQuizProblemOption(problemId: string, data: QuizProblemOptionCreate): Promise<QuizProblemOption> {
  const response = await apiClient.post<QuizProblemOption>(`/v1/user/quiz/problems/${problemId}/options`, data);
  return response.data;
}

// ─────────────────────────────────────────
// Quiz Attempt API
// ─────────────────────────────────────────

export interface QuizAttempt {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  percentage: number;
  rank: number | null;
  status: "in_progress" | "completed" | "timed_out" | "submitted_late";
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  created_at: string;
  updated_at: string;
}

export interface StartQuizResponse {
  attempt: QuizAttempt;
  problems: QuizProblem[];
}

/**
 * Start a quiz attempt
 * POST /api/v1/user/quiz/:quizId/start
 */
export async function startQuizAttempt(quizId: string): Promise<StartQuizResponse> {
  const response = await apiClient.post<StartQuizResponse>(`/v1/user/quiz/${quizId}/start`, {});
  return response.data;
}

/**
 * Autosave quiz response
 * POST /api/v1/user/quiz/attempt/:attemptId/save
 */
export async function saveQuizResponse(attemptId: string, data: {
  problemId: number;
  option?: string;
  textAnswer?: string;
  timeTaken?: number;
}): Promise<void> {
  await apiClient.post(`/v1/user/quiz/attempt/${attemptId}/save`, data);
}

/**
 * Submit a quiz attempt with batch responses
 * POST /api/v1/user/quiz/attempt/:attemptId/submit
 */
export async function submitQuizAttempt(attemptId: string, responses: Array<{ problemId: number; option?: string; textAnswer?: string }>): Promise<QuizAttempt> {
  const response = await apiClient.post<QuizAttempt>(`/v1/user/quiz/attempt/${attemptId}/submit`, { responses });
  return response.data;
}

// ─────────────────────────────────────────
// Quiz Results & Review API
// ─────────────────────────────────────────

export interface QuizResult {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  percentage: number;
  rank: number | null;
  status: string;
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
  created_at: string;
  updated_at: string;
  quiz_name: string;
  quiz_code: string;
  total_marks: number;
  passing_marks: number;
}

export interface QuestionReview {
  problem_id: number;
  question_number: number;
  problem_statement: string;
  problem_description: string | null;
  explaination: string | null;
  hint: string | null;
  problem_type: string;
  correct_answer: string | null;
  selected_option: string | null;
  answered_at: string | null;
}

/**
 * Get quiz result
 * GET /api/v1/user/quiz/result/:attemptId
 */
export async function getQuizResult(attemptId: string): Promise<QuizResult> {
  const response = await apiClient.get<QuizResult>(`/v1/user/quiz/result/${attemptId}`);
  return response.data;
}

/**
 * Get question-wise review for a quiz attempt
 * GET /api/v1/user/quiz/result/:attemptId/review
 */
export async function getQuizReview(attemptId: string): Promise<QuestionReview[]> {
  const response = await apiClient.get<QuestionReview[]>(`/v1/user/quiz/result/${attemptId}/review`);
  return response.data;
}

// ─────────────────────────────────────────
// Quiz Analytics API
// ─────────────────────────────────────────

export interface QuizAnalyticsStats {
  total_attempts: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  average_completion_time: number;
  completion_rate: string;
  total_registrations: number;
}

export interface QuestionAnalytics {
  id: number;
  question_number: number;
  problem_statement: string;
  problem_type: string;
  difficulty: number | null;
  difficulty_name: string | null;
  total_attempts: number;
  total_responses: number;
  correct_responses: number;
}

export interface QuizAnalytics {
  stats: QuizAnalyticsStats;
  question_stats: QuestionAnalytics[];
}

/**
 * Get quiz analytics
 * GET /api/v1/user/quiz/:quizId/analytics
 */
export async function getQuizAnalytics(quizId: string): Promise<QuizAnalytics> {
  const response = await apiClient.get<QuizAnalytics>(`/v1/user/quiz/${quizId}/analytics`);
  return response.data;
}

// ─────────────────────────────────────────
// Previous Quizzes API
// ─────────────────────────────────────────

export interface PreviousQuiz {
  attempt_id: number;
  quiz_id: number;
  name: string;
  code: string;
  total_marks: number;
  passing_marks: number;
  score: number;
  percentage: number;
  rank: number | null;
  status: string;
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_questions: number;
}

/**
 * Get previous quizzes (attempted by student)
 * GET /api/v1/user/quiz/previous
 */
export async function getPreviousQuizzes(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}): Promise<{ quizzes: PreviousQuiz[]; total: number }> {
  const response = await apiClient.get("/v1/user/quiz/previous", { params });
  const quizzes = (response.data || []) as PreviousQuiz[];
  const pagination = (response as any).pagination;
  return { quizzes, total: pagination?.total ?? quizzes.length };
}

// ─────────────────────────────────────────
// Join Quiz API
// ─────────────────────────────────────────

export interface JoinQuizResponse {
  quiz: Quiz;
  registration: QuizRegistration;
}

/**
 * Join quiz by code or ID
 * POST /api/v1/user/quiz/join
 */
export async function joinQuiz(data: {
  code?: string;
  quizId?: number;
}): Promise<JoinQuizResponse> {
  const response = await apiClient.post<JoinQuizResponse>("/v1/user/quiz/join", data);
  return response.data;
}

// ─────────────────────────────────────────
// Quiz Leaderboard API
// ─────────────────────────────────────────

export interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  college?: string;
  marks: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeTaken: number;
  submissionTime: string;
  status: "completed" | "timed_out" | "submitted_late" | "disconnected";
}

export interface QuizLeaderboardStats {
  participants: number;
  highestScore: number;
  averageScore: number;
  lowestScore: number;
  avgCompletionTime: number;
  quizDuration: number;
  completionRate: number;
}

export interface QuizLeaderboardResponse {
  quizId: string;
  quizTitle: string;
  settings: {
    enabled: boolean;
    showToParticipants: boolean;
    showTop10Only: boolean;
    showOnlyOwnRank: boolean;
    anonymousMode: boolean;
  };
  entries: QuizLeaderboardEntry[];
  stats: QuizLeaderboardStats;
  currentUserRank?: {
    rank: number;
    marks: number;
    totalMarks: number;
  };
}

/**
 * Get quiz leaderboard
 * GET /api/v1/user/quiz/:quizId/leaderboard
 */
export async function getQuizLeaderboard(quizId: string, userId?: string): Promise<QuizLeaderboardResponse> {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  
  const response = await apiClient.get<QuizLeaderboardResponse>(`/v1/user/quiz/${quizId}/leaderboard`, { params });
  return response.data;
}

/**
 * Get quiz leaderboard settings
 * GET /api/v1/user/quiz/:quizId/leaderboard/settings
 */
export async function getQuizLeaderboardSettings(quizId: string): Promise<QuizLeaderboardSettings> {
  const response = await apiClient.get<QuizLeaderboardSettings>(`/v1/user/quiz/${quizId}/leaderboard/settings`);
  return response.data;
}

/**
 * Update quiz leaderboard settings
 * PATCH /api/v1/user/quiz/:quizId/leaderboard/settings
 */
export async function updateQuizLeaderboardSettings(quizId: string, settings: Partial<QuizLeaderboardSettings>): Promise<QuizLeaderboardSettings> {
  const response = await apiClient.patch<QuizLeaderboardSettings>(`/v1/user/quiz/${quizId}/leaderboard/settings`, settings);
  return response.data;
}

// ─────────────────────────────────────────
// Result Generation API
// ─────────────────────────────────────────

export interface GenerateResultsResponse {
  resultsGenerated: boolean;
  emailSent: boolean;
  emailError?: string;
  stats: {
    totalSubmissions: number;
    evaluated: number;
    leaderboardUpdated: boolean;
  };
}

/**
 * Manually generate results for a quiz (creator only)
 * POST /api/v1/user/quiz/:quizId/generate-results
 */
export async function generateQuizResults(quizId: string, options?: { force?: boolean; sendEmail?: boolean }): Promise<GenerateResultsResponse> {
  const response = await apiClient.post<GenerateResultsResponse>(`/v1/user/quiz/${quizId}/generate-results`, {
    force: options?.force ?? false,
    sendEmail: options?.sendEmail ?? true,
  });
  return response.data;
}

/**
 * Retry sending the marksheet email without recalculating results (creator only)
 * POST /api/v1/user/quiz/:quizId/retry-email
 */
export async function retryQuizResultsEmail(quizId: string): Promise<{ emailSent: boolean; emailError?: string }> {
  const response = await apiClient.post<{ emailSent: boolean; emailError?: string }>(`/v1/user/quiz/${quizId}/retry-email`);
  return response.data;
}
