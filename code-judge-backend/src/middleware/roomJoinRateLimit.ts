// Join-attempt limiter: 5 attempts per minute per user AND per IP. Both keys
// must stay under the cap, so rotating accounts cannot bypass the IP limit and
// rotating IPs cannot bypass the account limit.
import type { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis.js";
import { getClientIp } from "../utils/getClientIp.js";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60;

export const roomJoinRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Authentication required", statusCode: 401 });
    return;
  }

  const keys = [
    `room_join_attempts:user:${userId}`,
    `room_join_attempts:ip:${getClientIp(req)}`,
  ];

  try {
    for (const key of keys) {
      const count = Number((await redisClient.get(key)) || 0);
      if (count >= MAX_ATTEMPTS) {
        const ttl = await redisClient.ttl(key);
        const retryAfter = ttl > 0 ? ttl : WINDOW_SECONDS;
        res.setHeader("Retry-After", String(retryAfter));
        res.setHeader("X-RateLimit-Limit", String(MAX_ATTEMPTS));
        res.setHeader("X-RateLimit-Remaining", "0");
        res.status(429).json({
          success: false,
          message: "Too many join attempts. Please wait a minute and try again.",
          statusCode: 429,
          retryAfter,
        });
        return;
      }
    }

    for (const key of keys) {
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, WINDOW_SECONDS);
    }

    res.setHeader("X-RateLimit-Limit", String(MAX_ATTEMPTS));
    res.setHeader("X-RateLimit-Remaining", String(MAX_ATTEMPTS - 1));
    next();
  } catch (error) {
    // Match the platform's global limiter: fail open if Redis is unavailable
    // so a cache outage never locks students out of their classrooms.
    console.warn("roomJoinRateLimit error (fail-open):", error);
    next();
  }
};

export default roomJoinRateLimit;
