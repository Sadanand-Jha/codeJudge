import { STORAGE_KEYS } from "@/utils/storageKeys";

/**
 * Isolated platform session storage.
 * The platform token (minted only by owner OTP verification) is kept
 * COMPLETELY separate from the regular user auth (`byteclash_auth`):
 * it is never written to the auth store and never sent to non-platform
 * endpoints. The httpOnly `platform_session` cookie is the primary
 * credential; this stored copy is the Bearer fallback.
 */

const TOKEN_KEY = STORAGE_KEYS.PLATFORM_TOKEN;
const EMAIL_KEY = STORAGE_KEYS.PLATFORM_EMAIL;

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getPlatformToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function getPlatformEmail(): string | null {
  return safeGet(EMAIL_KEY);
}

export function setPlatformSession(token: string, email: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Storage unavailable — the httpOnly cookie still carries the session.
  }
}

export function clearPlatformSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}
