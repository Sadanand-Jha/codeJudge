// Extracts normalized client IP for logging and rate limiting.
import type { Request } from "express";
import { connectingIpFromTrustedPeer } from "./trustedProxy.ts";

/**
 * Returns the visitor IP normalized for Redis keys and logs.
 * - Behind Cloudflare: CF-Connecting-IP, only when the direct peer is in GEO_TRUSTED_PROXY_IPS.
 * - Otherwise: req.ip. With `trust proxy = 1` this is the nearest hop, which behind
 *   Cloudflare is an edge IP shared by many visitors, so CF-Connecting-IP is preferred.
 * - Falls back to socket address for non-proxy environments.
 */
export function getClientIp(req: Request): string {
  const cfClient = connectingIpFromTrustedPeer(
    req.socket?.remoteAddress,
    req.headers["cf-connecting-ip"]
  );
  if (cfClient) return cfClient;

  const raw = req.ip || req.socket?.remoteAddress || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  return raw.replace(/^::ffff:/, "").trim() || "unknown";
}
