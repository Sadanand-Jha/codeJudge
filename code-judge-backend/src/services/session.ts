// Session cookie helpers for the existing JWT session. OAuth login creates the
// same `session_token` cookie as password login, so all existing middleware and
// /auth/me behavior keep working unchanged.
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";

export const SESSION_COOKIE = "session_token";

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

/**
 * SameSite policy for cookies set by the backend.
 *
 * - "lax" : default. Safe when the frontend calls the backend same-origin
 *   (e.g. via the frontend's `/api` rewrite). NOT sent on cross-site
 *   fetch/XHR requests, so a cross-origin frontend will not send the cookie
 *   back after login → 401 on /me and protected routes.
 * - "none": required when frontend and backend are on different origins
 *   (e.g. Vercel frontend → Cloudflare tunnel/nginx backend). Must be paired
 *   with `secure: true` (enforced in production) and HTTPS everywhere.
 *
 * Set SESSION_COOKIE_SAME_SITE=none in production if your frontend origin
 * differs from the API origin; otherwise keep "lax".
 */
export function cookieSameSite(): "lax" | "none" | "strict" {
  const raw = (process.env.SESSION_COOKIE_SAME_SITE || "lax").toLowerCase();
  return raw === "none" || raw === "strict" ? (raw as "none" | "strict") : "lax";
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction, // true in production (NODE_ENV=production / VERCEL=1)
  sameSite: cookieSameSite(),
  path: "/",
};

export class SessionConfigurationError extends Error {
  constructor(message = "JWT_SECRET is not configured") {
    super(message);
    this.name = "SessionConfigurationError";
  }
}

export interface SessionClaims extends JwtPayload {
  userId: string;
  email: string;
}

/** Read the signing secret from the environment. Never fall back to a default. */
export function getSessionJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new SessionConfigurationError();
  return secret;
}

/** Mint a signed JWT for the httpOnly session cookie. */
export function createSessionToken(userId: string, email: string): string {
  const expiresIn = (process.env.JWT_EXPIRY || "10d") as SignOptions["expiresIn"];
  return jwt.sign(
    { userId: String(userId), email },
    getSessionJwtSecret(),
    { algorithm: "HS256", expiresIn },
  );
}

/** Verify a session JWT and return its typed claims. Throws on invalid/expired tokens. */
export function verifySessionToken(token: string): SessionClaims {
  const decoded = jwt.verify(token, getSessionJwtSecret(), { algorithms: ["HS256"] });
  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.email !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Invalid session payload");
  }
  return decoded as SessionClaims;
}

/** Remaining lifetime from the token's exp claim, so cookie and JWT expire together. */
function remainingSessionMs(token: string): number | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") return null;
  return Math.max(0, decoded.exp * 1000 - Date.now());
}

/** Mint a short-lived signed JWT and set it as an httpOnly session cookie. */
export function setSessionCookie(res: Response, userId: string, email: string): string {
  const token = createSessionToken(userId, email);
  const maxAge = remainingSessionMs(token);
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    ...(maxAge != null ? { maxAge } : {}),
  });
  return token;
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
}

/** Only same-origin absolute paths are allowed after login. */
const AUTH_PAGE_PATHS = ["/login", "/register", "/forgot-password"];

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!next || next.length > 512) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) return null;

  // Avoid returning to an auth page (e.g. ?next=/login), which would loop
  // after a successful sign-in.
  const path = next.split(/[?#]/, 1)[0];
  if (AUTH_PAGE_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))) {
    return null;
  }
  return next;
}
