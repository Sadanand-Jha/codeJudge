import apiClient from "@/lib/axios";

export interface CreatorOverviewAssessments {
  total: number;
  published: number;
  draft: number;
}

export interface CreatorOverviewAttempts {
  total: number;
  completed: number;
}

export interface CreatorOverviewStudents {
  total: number;
  recentActive: number;
  avgAttemptsPerStudent: number;
}

export interface CreatorRecentAttempt {
  id: number;
  quizId: number;
  quizName: string | null;
  studentId: number;
  studentName: string;
  username: string | null;
  score: number | null;
  percentage: number | string | null;
  status: string | null;
  attemptedAt: string | null;
}

export interface CreatorRecentQuiz {
  id: number;
  name: string;
  code: string | null;
  status: number | null;
  createdAt: string | null;
}

export interface CreatorProfileOverview {
  assessments: CreatorOverviewAssessments;
  attempts: CreatorOverviewAttempts;
  students: CreatorOverviewStudents;
  recentAttempts: CreatorRecentAttempt[];
  recentQuizzes: CreatorRecentQuiz[];
}

const EMPTY: CreatorProfileOverview = {
  assessments: { total: 0, published: 0, draft: 0 },
  attempts: { total: 0, completed: 0 },
  students: { total: 0, recentActive: 0, avgAttemptsPerStudent: 0 },
  recentAttempts: [],
  recentQuizzes: [],
};

/**
 * Aggregated dashboard numbers for the authenticated creator's own profile.
 * GET /api/v1/admin/quiz/profile-overview
 * (The axios interceptor already unwraps the { success, data } envelope.)
 */
export async function getCreatorProfileOverview(): Promise<CreatorProfileOverview> {
  const response = await apiClient.get<Partial<CreatorProfileOverview>>("/v1/admin/quiz/profile-overview");
  const data = response.data ?? {};
  return {
    assessments: { ...EMPTY.assessments, ...data.assessments },
    attempts: { ...EMPTY.attempts, ...data.attempts },
    students: { ...EMPTY.students, ...data.students },
    recentAttempts: Array.isArray(data.recentAttempts) ? data.recentAttempts : [],
    recentQuizzes: Array.isArray(data.recentQuizzes) ? data.recentQuizzes : [],
  };
}
