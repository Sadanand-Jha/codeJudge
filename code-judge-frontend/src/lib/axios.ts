import axios from "axios";
import { showUpgradeModalForError } from "@/lib/upgradePrompt";
import { showCustomHeaderUpgrade } from "@/lib/customHeaderUpgrade";

const rawBase =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";
// Prefer the relative `/api` base so next.config.ts rewrites to BACKEND_URL and
// the host-only session cookie remains first-party. An absolute API host is
// honored, but auth cookies set on the frontend host are NOT sent to another
// host (even a sibling subdomain), so protected requests will look signed out.
const API_BASE = rawBase.replace(/\/v1\/?$/, "").replace(/\/$/, "") || "/api";

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Session auth is cookie-only. Do not attach a bearer token from localStorage:
// the signed JWT lives exclusively in the httpOnly `session_token` cookie. The
// backend keeps `Authorization` support only for non-browser API clients.
// Response interceptor to unwrap { success, data } envelope
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success === true && "data" in response.data) {
        const { data, pagination } = response.data;
        response.data = data;
        if (pagination) {
          (response as typeof response & { pagination?: unknown }).pagination = pagination;
        }
      }
    }
    return response;
  },
  (error) => {
    if (error?.response?.status === 403) {
      const payload = error.response.data as { code?: string; data?: { code?: string } } | undefined;
      if (payload?.code === "PLAN_UPGRADE_REQUIRED" || payload?.data?.code === "PLAN_UPGRADE_REQUIRED") {
        showCustomHeaderUpgrade();
      } else {
        showUpgradeModalForError(error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;