// Regular user-session JWT helpers.
//
// Security invariant: never fall back to a built-in secret. A token signed with
// a known default lets anyone mint a session for any userId and then spend that
// account's credits or change its plan.
import jwt, { type SignOptions } from "jsonwebtoken";

export const MIN_SECRET_LENGTH = 32;

const KNOWN_WEAK_SECRETS = new Set([
  "your-fallback-secret-key-change-in-production",
  "i_am_iron_man",
  "change-me",
  "changeme",
  "secret",
]);

export interface SessionClaims {
  userId: string;
  email: string;
}

/**
 * Rejects missing, short, or well-known secrets. Callers should surface the
 * thrown message only in logs; it never contains the secret value.
 */
export function requireStrongSecret(name: string, value: string | undefined): string {
  const secret = (value ?? "").trim();
  if (!secret) {
    throw new Error(
      `${name} is not configured. Set a random secret of at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  if (secret.length < MIN_SECRET_LENGTH || KNOWN_WEAK_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      `${name} is too weak. Use a random secret of at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

export function getJwtSecret(): string {
  return requireStrongSecret("JWT_SECRET", process.env.JWT_SECRET);
}

/**
 * Startup guard for both session secrets. The platform secret is optional
 * because it can be derived from JWT_SECRET, but an explicitly configured one
 * must be strong too.
 */
export function assertJwtSecretsConfigured(): void {
  getJwtSecret();
  const platformSecret = process.env.PLATFORM_JWT_SECRET?.trim();
  const regularSecret = process.env.JWT_SECRET?.trim();
  if (platformSecret && platformSecret !== regularSecret) {
    requireStrongSecret("PLATFORM_JWT_SECRET", platformSecret);
  }
}

export function signSessionToken(
  claims: SessionClaims,
  expiresIn = process.env.JWT_EXPIRY || "10d"
): string {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(
    { userId: String(claims.userId), email: claims.email },
    getJwtSecret(),
    options
  );
}

/**
 * Verifies a regular session token and returns normalized claims. Returns null
 * for missing, expired, tampered, or malformed tokens; callers map that to 401.
 */
export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || decoded === null) return null;

    const userIdValue = (decoded as { userId?: unknown }).userId;
    const emailValue = (decoded as { email?: unknown }).email;
    const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";
    const email = typeof emailValue === "string" ? emailValue.trim() : "";

    if (!userId || !email) return null;
    return { userId, email };
  } catch {
    return null;
  }
}
