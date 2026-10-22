// Global rate limiter: 400 requests per minute per IP, block for 30 seconds if exceeded.
import type { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis.js";
import { getClientIp } from "../utils/getClientIp.js";

const MAX_REQUESTS_PER_MINUTE = 400;
const WINDOW_SECONDS = 60;
const BLOCK_DURATION_SECONDS = 30;

// Paths that bypass global rate limiting (health checks, etc.)
const BYPASS_PATHS = new Set(["/health"]);

export async function globalRateLimit(req: Request, res: Response, next: NextFunction) {
  // Skip bypass paths
  if (BYPASS_PATHS.has(req.path)) {
    return next();
  }

  const ip = getClientIp(req);

  // Skip if IP cannot be determined or is internal unknown
  if (!ip || ip === "unknown") {
    return next();
  }

  const blockKey = `block_ip:${ip}`;
  const countKey = `req_count:${ip}`;

  try {
    // 1. Check if IP is currently blocked (30-second block)
    const blocked = await redisClient.get(blockKey);
    if (blocked) {
      let retryAfter = BLOCK_DURATION_SECONDS;
      try {
        const ttl = await redisClient.ttl(blockKey);
        // Shorten blocks created before the 30-second policy was introduced.
        if (ttl > BLOCK_DURATION_SECONDS) {
          await redisClient.expire(blockKey, BLOCK_DURATION_SECONDS);
          retryAfter = BLOCK_DURATION_SECONDS;
        } else if (ttl > 0) {
          retryAfter = ttl;
        }
      } catch {}

      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_MINUTE));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        success: false,
        message: `Too many requests. Your IP has been blocked for 30 seconds due to exceeding ${MAX_REQUESTS_PER_MINUTE} requests per minute. Please try again after ${retryAfter} seconds.`,
        statusCode: 429,
        retryAfter,
      });
      return;
    }

    // 2. Increment per-minute counter
    const count = await redisClient.incr(countKey);
    if (count === 1) {
      await redisClient.expire(countKey, WINDOW_SECONDS);
    }

    // 3. If limit exceeded, block IP for 30 seconds
    if (count > MAX_REQUESTS_PER_MINUTE) {
      await redisClient.setEx(blockKey, BLOCK_DURATION_SECONDS, "1");
      // Clean up counter to avoid stale data
      await redisClient.del(countKey);

      res.setHeader("Retry-After", String(BLOCK_DURATION_SECONDS));
      res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_MINUTE));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        success: false,
        message: `Too many requests. You have exceeded ${MAX_REQUESTS_PER_MINUTE} requests per minute. Your IP is now blocked for 30 seconds.`,
        statusCode: 429,
        retryAfter: BLOCK_DURATION_SECONDS,
      });
      return;
    }

    // 4. Set informative headers and continue
    res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS_PER_MINUTE));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS_PER_MINUTE - count)));
    return next();
  } catch (err) {
    // On Redis failure, fail open (allow request) to avoid blocking legitimate traffic
    console.warn("globalRateLimit error (fail-open):", err);
    return next();
  }
}

export default globalRateLimit;
