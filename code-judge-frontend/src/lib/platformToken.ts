import { STORAGE_KEYS } from "@/utils/storageKeys";

/**
 * Isolated platform session storage.
 * The platform JWT lives only in the httpOnly `platform_session` cookie.
 * JavaScript stores the display email, never the credential itself. This
 * keeps the owner session isolated from regular auth and inaccessible to XSS.
 */

const EMAIL_KEY = STORAGE_KEYS.PLATFORM_EMAIL;
export const PLATFORM_SESSION_INVALID_EVENT = "platform-session-invalid";

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getPlatformEmail(): string | null {
  return safeGet(EMAIL_KEY);
}

export function setPlatformSession(email: string): void {
  try {
    // Remove the legacy JS-readable token during migration. Authentication is
    // now cookie-only; only this non-sensitive label remains in storage.
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_TOKEN);
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Storage unavailable — the httpOnly cookie still carries the session.
  }
}

export function clearPlatformSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PLATFORM_TOKEN);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function notifyPlatformSessionInvalid(status: 401 | 403 = 401): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLATFORM_SESSION_INVALID_EVENT, { detail: { status } }));
}
