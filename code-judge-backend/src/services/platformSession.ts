import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import redisClient from "../config/redis.js";

/**
 * Platform session — a COMPLETELY separate token from the regular user
 * session (`session_token` / JWT_SECRET).
 *
 * - Signed with PLATFORM_JWT_SECRET (never JWT_SECRET). If the two secrets
 *   are equal or the platform secret is unset, issuance and verification
 *   fail closed.
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
  const s = process.env.PLATFORM_JWT_SECRET;
  if (!s || s === process.env.JWT_SECRET) return null;
  return s;
}

export function platformExpiry(): string {
  return process.env.PLATFORM_JWT_EXPIRY || "12h";
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
