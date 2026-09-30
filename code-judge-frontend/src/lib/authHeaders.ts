import { STORAGE_KEYS } from "@/utils/storageKeys";

/**
 * Authorization fallback for requests that use native fetch instead of the
 * shared Axios client. This is required when the frontend and API are on
 * different Vercel origins, where the session cookie may not be sent.
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token ?? parsed?.token;
    return token && token !== "session"
      ? { Authorization: `Bearer ${token}` }
      : {};
  } catch {
    return {};
  }
}
