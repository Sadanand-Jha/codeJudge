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

// The dashboard mounts many independent panels at once. Without a client-side
// gate, each panel creates a separate serverless request and those functions
// all compete for limited PostgreSQL connections. Keep the UI independent,
// but allow only a small number of platform requests to be in flight.
const MAX_CONCURRENT_PLATFORM_REQUESTS = 2;
let activePlatformRequests = 0;
const platformRequestQueue: Array<() => void> = [];
const pendingPlatformGets = new Map<string, Promise<unknown>>();

function drainPlatformRequestQueue() {
  while (activePlatformRequests < MAX_CONCURRENT_PLATFORM_REQUESTS && platformRequestQueue.length) {
    platformRequestQueue.shift()?.();
  }
}

function schedulePlatformRequest<T>(request: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    platformRequestQueue.push(() => {
      activePlatformRequests += 1;
      request()
        .then(resolve, reject)
        .finally(() => {
          activePlatformRequests -= 1;
          drainPlatformRequestQueue();
        });
    });
    drainPlatformRequestQueue();
  });
}

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

export interface RequestLogRow {
  request_id: string;
  trace_id: string;
  user_id: number | null;
  username: string | null;
  email: string | null;
  method: string;
  endpoint: string;
  route_template: string | null;
  status_code: number;
  success: boolean;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  ip_address: string | null;
  user_agent: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface ObservabilityData {
  available: boolean;
  reason?: string;
  days?: number;
  activeWindowMinutes?: number;
  summary?: {
    requests: number; succeeded: number; failed: number; errorRate: number;
    avgLatencyMs: number; p50Ms: number; p95Ms: number; p99Ms: number; onlineUsers: number;
  };
  today?: { requests: number; succeeded: number; failed: number };
  slowEndpoints?: { endpoint: string; method: string; requests: number; avg_ms: number; p95_ms: number; max_ms: number }[];
  failingEndpoints?: { endpoint: string; method: string; requests: number; failures: number; error_rate: number }[];
  topUsers?: { user_id: number | null; username: string; requests: number; failures: number; avg_ms: number }[];
  activeUsers?: { user_id: number; username: string; email: string; last_seen_at: string; device_type: string; browser: string; os: string; ip_address: string | null }[];
  recent?: RequestLogRow[];
}

export interface RequestDetailData {
  log: RequestLogRow & Record<string, unknown>;
  metadata: { query_params: unknown; path_params: unknown; request_body: unknown; response_metadata: unknown } | null;
  trace: Array<Record<string, unknown>>;
  ai: Array<Record<string, unknown>>;
  context: Array<Record<string, unknown>>;
}

export interface AiUsageData {
  available: boolean; reason?: string; requestsToday?: number; requestsMonth?: number;
  failed?: number; tokens?: number; estimatedCost?: number | null; avgLatencyMs?: number;
  byModel?: { provider: string; model: string; requests: number; tokens: number; failures: number; avg_ms: number }[];
  byUser?: { user_id: number | null; username: string; requests: number; tokens: number }[];
  byEndpoint?: { endpoint: string; requests: number; tokens: number; failures: number }[];
}

export interface PlatformErrorsData {
  available: boolean; reason?: string; errorsToday?: number; unresolved?: number;
  items: { error_id: string; fingerprint: string; error_type: string; error_code: string | null; message: string; endpoint: string | null; method: string | null; status_code: number | null; occurrence_count: number; first_seen_at: string; last_seen_at: string; resolved_at: string | null; request_id: string | null; trace_id: string | null }[];
}

export interface QuestionImportCatalog {
  subjects: { id: number; name: string }[];
  chapters: { id: number; subject_id: number; name: string }[];
  topics: { id: number; chapter_id: number; name: string }[];
  difficulties: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}

export interface SubjectiveImportPreview {
  batchId: string;
  sourceFilename: string;
  scope: { subject_name: string; chapter_name: string | null; topic_name: string | null };
  questions: {
    question_text: string;
    question_html: string;
    subject_id: number;
    chapter_id: number | null;
    topic_id: number | null;
    difficulty_id: number;
    category_id: number;
    chapter_name: string | null;
    topic_name: string | null;
    difficulty_name: string;
    category_name: string;
  }[];
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  expiresInSeconds: number;
}

export interface BankQuestion {
  id: number;
  subjectId: number;
  subjectName: string;
  chapterId: number | null;
  chapterName: string | null;
  topicId: number | null;
  topicName: string | null;
  difficultyId: number;
  difficulty: string;
  categoryId: number;
  category: string;
  questionText: string;
  questionHtml: string;
  createdAt: string;
}

export interface BankQuestionFilters {
  subjectId?: number | null;
  chapterId?: number | null;
  topicId?: number | null;
  difficultyId?: number | null;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BankQuestionsData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  questions: BankQuestion[];
  facets: {
    subjects: { id: number; name: string; count: number }[];
    chapters: { id: number; subjectId: number; name: string; count: number }[];
    topics: { id: number; chapterId: number; name: string; count: number }[];
    difficulties: { id: number; name: string }[];
  };
}

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const key = `${path}?${new URLSearchParams(
    Object.entries(params ?? {}).map(([name, value]) => [name, String(value)])
  ).toString()}`;
  const existing = pendingPlatformGets.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = schedulePlatformRequest(async () => {
    const res = await platformClient.get<T>(`/v1/platform${path}`, { params });
    return res.data;
  }).finally(() => {
    pendingPlatformGets.delete(key);
  });
  pendingPlatformGets.set(key, pending);
  return pending;
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
  observability: (range: PlatformRange, days?: number) => get<ObservabilityData>("/observability", days ? { range, days } : { range }),
  requestDetail: (requestId: string) => get<RequestDetailData>(`/requests/${encodeURIComponent(requestId)}`),
  questionImportCatalog: () => get<QuestionImportCatalog>("/question-import/catalog"),
  previewQuestionImport: (form: FormData) => schedulePlatformRequest(async () => {
    const response = await platformClient.post<SubjectiveImportPreview>("/v1/platform/question-import/preview", form, {
      headers: { "Content-Type": "multipart/form-data" },
      // Local document models can take several minutes for a full paper.
      // Keep this request alive while the server consumes the model stream.
      timeout: 15 * 60_000,
    });
    return response.data;
  }),
  previewQuestionImportJson: (questions: unknown[]) => schedulePlatformRequest(async () => {
    const response = await platformClient.post<SubjectiveImportPreview>(
      "/v1/platform/question-import/json-preview",
      { questions }
    );
    return response.data;
  }),
  commitQuestionImport: (batchId: string, selectedIndexes: number[]) => schedulePlatformRequest(async () => {
    const response = await platformClient.post<{ inserted: number; skippedDuplicates: number; selected: number }>(
      "/v1/platform/question-import/commit",
      { batchId, selectedIndexes }
    );
    return response.data;
  }),
  questions: (filters: BankQuestionFilters = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.subjectId) params.subjectId = filters.subjectId;
    if (filters.chapterId) params.chapterId = filters.chapterId;
    if (filters.topicId) params.topicId = filters.topicId;
    if (filters.difficultyId) params.difficultyId = filters.difficultyId;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    return get<BankQuestionsData>("/questions", params);
  },
  deleteQuestion: (questionId: number) => schedulePlatformRequest(async () => {
    const response = await platformClient.delete<{ deleted: number; id: number }>(
      `/v1/platform/questions/${encodeURIComponent(String(questionId))}`
    );
    return response.data;
  }),
  ai: () => get<AiUsageData>("/ai"),
  health: () => get<{
    services: Record<string, { status: string; latencyMs?: number | null; note?: string }>;
    errors: { today5xx: number | null; today4xx: number | null; note: string };
  }>("/health"),
  jobs: () => get<{ available: boolean; reason: string; queued: null; failed: null; failedJobs: [] }>("/jobs"),
  errors: () => get<PlatformErrorsData>("/errors"),
  security: () => get<{ recentLogins: { id: number; username: string; email: string; at: string }[]; note: string }>("/security"),
  audit: () => get<{ available: boolean; reason: string; items: [] }>("/audit"),
  storage: () => get<{ databaseBytes: number | null; note?: string }>("/storage"),
  growth: (range: PlatformRange, days?: number) => get<{ points: { date: string; new_users: number; new_quizzes: number; attempts: number }[] | null }>("/growth", days ? { range, days } : { range }),
  search: (q: string) => get<{ users: { id: number; username: string; email: string }[]; quizzes: { id: number; name: string; code: string }[]; attempts: { id: number; quiz_id: number; user_id: number; status: string; username: string | null }[] }>("/search", { q }),
  alerts: () => get<{ items: { severity: string; message: string; link: string }[] }>("/alerts"),
};
