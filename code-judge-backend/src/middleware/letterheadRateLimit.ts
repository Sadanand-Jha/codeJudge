import type { NextFunction, Request, Response } from "express";
import redisClient from "../config/redis.ts";

const WINDOW_SECONDS = 10 * 60;
const MAX_SIGNATURES = 20;

/** Per-user upload-signature limit: 20 requests per 10 minutes. */
export async function letterheadSignatureRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  const key = `letterhead_signature_count:${userId}`;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, WINDOW_SECONDS);
    if (count > MAX_SIGNATURES) {
      const ttl = await redisClient.ttl(key);
      const retryAfter = ttl > 0 ? ttl : WINDOW_SECONDS;
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(MAX_SIGNATURES));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: "Too many upload attempts. Please wait a few minutes and try again.",
        statusCode: 429,
        retryAfter,
      });
      return;
    }
    res.setHeader("X-RateLimit-Limit", String(MAX_SIGNATURES));
    res.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, MAX_SIGNATURES - count))
    );
    next();
  } catch (error) {
    console.warn("letterheadSignatureRateLimit error (fail-open):", error);
    next();
  }
}

export default letterheadSignatureRateLimit;
