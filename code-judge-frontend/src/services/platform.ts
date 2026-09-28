import axios from "axios";
import { clearPlatformSession, notifyPlatformSessionInvalid } from "@/lib/platformToken";

/**
 * Owner-only platform API client.
 * Uses a DEDICATED axios instance authenticated only by the HttpOnly
 * platform_session cookie. The regular user session is never attached here.
 * All endpoints are server-side gated by requireOwner.
 */

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";
const API_BASE = rawBase.startsWith("http")
  ? "/api"
  : rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "") || "/api";

const platformClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

platformClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success === true && "data" in response.data) {
        response.data = (response.data as { data: unknown }).data;
      }
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      clearPlatformSession();
      notifyPlatformSessionInvalid(status);
    }
    return Promise.reject(error);
  }
);

export type PlatformRange = "today" | "7d" | "30d" | "90d";

export interface MetricValue {
  value: number | null;
  deltaPct?: number | null;
  unavailable?: boolean;
}

export interface OverviewData {
  range: string;
  days: number;
  users: { total: number; newToday: number; newWeek: number; newMonth: number; newWeekChangePct: number | null } | null;
  active: { today: number; last7d: number; last30d: number; online: number; changePct: number | null } | null;
  quizzes: { total: number; createdToday: number; byStatus: { status: string; n: number }[] | null } | null;
  attempts: { total: number; today: number; completedToday: number; completed: number } | null;
  engagement: { completionRate: number | null; avgScore: number | null; avgDurationS: number | null; avgAttemptsPerUser: number | null } | null;
}

export interface SeriesPoint { label: string; date: string; dau: number; new_users: number; attempts: number; completed: number; [k: string]: unknown }
export interface LiveData {
  online: number; takingQuizzes: number; activeQuizRooms: number; liveRooms: number | null;
  attemptsInProgress: number; events: { kind: string; actor: string | null; object: string | null; at: string | null }[];
}
export interface ActivityItem { type: string; scope: string; actor: string | null; object: string | null; at: string | null; meta: string | null }

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const res = await platformClient.get<T>(`/v1/platform${path}`, { params });
  return res.data;
}

export const platformApi = {
  session: () => get<{ authorized: true }>("/session"),
  overview: (range: PlatformRange, days?: number) => get<OverviewData>("/overview", days ? { range, days } : { range }),
  series: (range: PlatformRange, days?: number) => get<{ points: SeriesPoint[] | null; unavailable?: boolean }>("/series", days ? { range, days } : { range }),
  live: () => get<LiveData>("/live"),
  activity: (scope = "all", search = "", page = 1, limit = 20) =>
    get<{ items: ActivityItem[]; total: number | null; page: number; scopes: string[] }>("/activity", { scope, search, page, limit }),
  users: () => get<{
    total: number; new30d: number; returning30d: number; dormant: number;
    avgSessionsPerUser: number | null; avgSessionDurationS: number | null;
    topUsers: { id: number; username: string; email: string; last_active: string | null; attempts: number; completed: number }[];
    topTeachers: { id: number; username: string; created: number; live: number; attempts_generated: number; last_active: string | null }[];
  }>("/users"),
  quizzes: () => get<{
    byStatus: { status: string; n: number }[] | null;
    stats: { total: number; completed: number; in_progress: number; abandoned: number; avg_score: number | null; avg_duration_s: number | null } | null;
    funnel: { opened: number; started: number; answered: number | null; submitted: number; completed: number } | null;
    top: { id: number; name: string; code: string; status: string; creator: string | null; attempts: number; completed: number; avg_score: number | null; avg_duration_s: number | null; last_activity: string | null }[];
    questionTypes: { type: string; n: number }[] | null;
    hardest: { id: number; quiz_id: number; statement: string | null; responses: number; skip_rate: number | null; avg_time_s: number | null }[];
    totalQuestions: number | null;
  }>("/quizzes"),
  ai: () => get<{ available: boolean; reason: string } & Record<string, unknown>>("/ai"),
  health: () => get<{
    services: Record<string, { status: string; latencyMs?: number | null; note?: string }>;
    errors: { today5xx: number | null; today4xx: number | null; note: string };
  }>("/health"),
  jobs: () => get<{ available: boolean; reason: string; queued: null; failed: null; failedJobs: [] }>("/jobs"),
  errors: () => get<{ available: boolean; reason: string; items: [] }>("/errors"),
  security: () => get<{ recentLogins: { id: number; username: string; email: string; at: string }[]; note: string }>("/security"),
  audit: () => get<{ available: boolean; reason: string; items: [] }>("/audit"),
  storage: () => get<{ databaseBytes: number | null; note?: string }>("/storage"),
  growth: (range: PlatformRange, days?: number) => get<{ points: { date: string; new_users: number; new_quizzes: number; attempts: number }[] | null }>("/growth", days ? { range, days } : { range }),
  search: (q: string) => get<{ users: { id: number; username: string; email: string }[]; quizzes: { id: number; name: string; code: string }[]; attempts: { id: number; quiz_id: number; user_id: number; status: string; username: string | null }[] }>("/search", { q }),
  alerts: () => get<{ items: { severity: string; message: string; link: string }[] }>("/alerts"),
};
