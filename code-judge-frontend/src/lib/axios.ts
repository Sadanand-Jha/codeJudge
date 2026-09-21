import axios from "axios";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";
// Option B: Always use same-origin /api via Next.js rewrites so cookies are
// first-party (SameSite=Lax). If env is absolute (https://.../api) we still
// route through /api proxy - rewrites in next.config.ts forwards to real backend.
const API_BASE = rawBase.startsWith("http")
  ? "/api"
  : rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "") || "/api";

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization fallback when cookie is not present (e.g. before
// rewrites deploy or direct cross-origin call). Backend middleware
// `auth.ts:23` checks both cookie and `Authorization: Bearer <token>`.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined" && !config.headers.Authorization) {
    try {
      const raw = localStorage.getItem("byteclash_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Zustand persist shape: { state: { token, user, isAuthenticated }, version }
        const token = parsed?.state?.token || parsed?.token;
        if (token && token !== "session") {
          (config.headers as any).Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Response interceptor to unwrap { success, data } envelope
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success === true && "data" in response.data) {
        const { data, pagination, ...rest } = response.data;
        response.data = data;
        if (pagination) {
          (response as any).pagination = pagination;
        }
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;