// Extracts normalized client IP for rate-limiting. Works with Vercel's X-Forwarded-For via trust proxy.
import type { Request } from "express";

/**
 * Returns the client IP address normalized for Redis key usage.
 * - Uses `req.ip` which is trustworthy due to `app.set("trust proxy", 1)` in app.ts:49
 * - Falls back to socket address for non-proxy environments
 * - Strips IPv6-mapped IPv4 prefix `::ffff:` for cleaner keys
 */
export function getClientIp(req: Request): string {
  const raw = req.ip || req.socket?.remoteAddress || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  return raw.replace(/^::ffff:/, "").trim() || "unknown";
}
