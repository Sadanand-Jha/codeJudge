import type { NextFunction, Request, Response } from "express";
import redisClient from "../config/redis.ts";

const WINDOW_SECONDS = 10 * 60;

function createSignatureRateLimit(scope: string, maxSignatures: number) {
  return async function signatureRateLimit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const key = `${scope}_signature_count:${userId}`;
    try {
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, WINDOW_SECONDS);
      if (count > maxSignatures) {
        const ttl = await redisClient.ttl(key);
        const retryAfter = ttl > 0 ? ttl : WINDOW_SECONDS;
        res.setHeader("Retry-After", String(retryAfter));
        res.setHeader("X-RateLimit-Limit", String(maxSignatures));
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
      res.setHeader("X-RateLimit-Limit", String(maxSignatures));
      res.setHeader(
        "X-RateLimit-Remaining",
        String(Math.max(0, maxSignatures - count))
      );
      next();
    } catch (error) {
      console.warn(`${scope}SignatureRateLimit error (fail-open):`, error);
      next();
    }
  };
}

/** Per-user upload-signature limit: 20 requests per 10 minutes. */
export const letterheadSignatureRateLimit = createSignatureRateLimit("letterhead", 20);

/** Avatar uploads are small and infrequent: 10 signatures per 10 minutes. */
export const avatarSignatureRateLimit = createSignatureRateLimit("avatar", 10);

export default letterheadSignatureRateLimit;
