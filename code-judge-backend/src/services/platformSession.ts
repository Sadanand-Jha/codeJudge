import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import redisClient from "../config/redis.js";

/**
 * Platform session — a COMPLETELY separate token from the regular user
 * session (`session_token` / JWT_SECRET).
 *
 * - Signed with PLATFORM_JWT_SECRET when provided. Otherwise a
 *   domain-separated signing key is derived from JWT_SECRET, so regular and
 *   platform tokens remain cryptographically isolated.
 * - Carries `scope: "platform"`. Regular session tokens have no scope and
 *   are rejected on platform routes — even for admins. OTP verification is
 *   therefore mandatory for platform access.
 * - Short-lived (default 12h vs 10d for regular sessions).
 * - Revocation lives under its own Redis namespace.
 */

export const PLATFORM_COOKIE = "platform_session";
const BLACKLIST_PREFIX = "platform_blacklist:";
const SCOPE = "platform";

export interface PlatformClaims {
  userId: string;
  email: string;
  scope: "platform";
}

function platformSecret(): string | null {
  const explicit = process.env.PLATFORM_JWT_SECRET?.trim();
  const regular = process.env.JWT_SECRET?.trim();

  if (explicit && explicit !== regular) return explicit;
  if (!regular) return null;

  // Keep platform tokens cryptographically isolated even when Vercel only has
  // the application's JWT_SECRET configured. Domain separation means a normal
  // session token still cannot be verified as a platform token.
  return crypto
    .createHmac("sha256", regular)
    .update("codejudge:platform-session:v1")
    .digest("hex");
}

export function isPlatformAuthConfigured(): boolean {
  return platformSecret() !== null;
}

export function platformExpiry(): string {
  return process.env.PLATFORM_JWT_EXPIRY || "12h";
}

export function platformCookieMaxAgeMs(): number {
  const value = platformExpiry().trim().toLowerCase();
  const match = /^(\d+)\s*([smhd])$/.exec(value);
  if (!match) return 12 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unitMs = match[2] === "s"
    ? 1000
    : match[2] === "m"
      ? 60_000
      : match[2] === "h"
        ? 3_600_000
        : 86_400_000;
  return amount * unitMs;
}

export function platformOwnerEmails(): string[] {
  return (process.env.PLATFORM_OWNER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwner(roleId: unknown, email: unknown): boolean {
  if (Number(roleId) === 2) return true;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail !== "" && platformOwnerEmails().includes(normalizedEmail);
}

export function mintPlatformToken(userId: string, email: string): string | null {
  const secret = platformSecret();
  if (!secret) return null;
  const signOptions: SignOptions = { expiresIn: platformExpiry() as SignOptions["expiresIn"] };
  return jwt.sign({ userId, email, scope: SCOPE }, secret, signOptions);
}

export function verifyPlatformToken(token: string): PlatformClaims | null {
  const secret = platformSecret();
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as Partial<PlatformClaims>;
    if (!decoded || decoded.scope !== SCOPE || !decoded.userId || !decoded.email) return null;
    return { userId: decoded.userId, email: decoded.email, scope: SCOPE };
  } catch {
    return null;
  }
}

export async function isPlatformTokenRevoked(token: string): Promise<boolean> {
  const v = await redisClient.get(`${BLACKLIST_PREFIX}${token}`);
  return v !== null;
}

export async function revokePlatformToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const ttl = decoded?.exp ? Math.max(60, decoded.exp - Math.floor(Date.now() / 1000)) : 12 * 60 * 60;
    await redisClient.setEx(`${BLACKLIST_PREFIX}${token}`, ttl, "revoked");
  } catch {
    // Revocation is best-effort; a failure here must not block logout.
  }
}
