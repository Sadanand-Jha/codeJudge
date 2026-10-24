import redisClient from "../config/redis.ts";

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * 60 * 60;

export const RESPONSES_EMAIL_HOURLY_LIMIT = 1;
export const RESPONSES_EMAIL_DAILY_LIMIT = 5;

type QuotaDenied = {
  allowed: false;
  reason: "hourly" | "daily";
  retryAfterSeconds: number;
  message: string;
};

type QuotaAllowed = {
  allowed: true;
  release: () => Promise<void>;
};

export type ResponseEmailQuota = QuotaAllowed | QuotaDenied;

function formatRetry(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Response emails are limited to 1 per hour per quiz and 5 per day globally
 * across all quizzes for the requesting creator.
 */
export async function reserveResponseEmailQuota(
  userId: number,
  quizId: number
): Promise<ResponseEmailQuota> {
  const hourKey = `quiz:responses-email:hour:${userId}:${quizId}`;
  const dayKey = `quiz:responses-email:day:${userId}`;

  try {
    const hourTtl = await redisClient.ttl(hourKey);
    if (hourTtl !== -2) {
      const retryAfterSeconds = hourTtl > 0 ? hourTtl : HOUR_SECONDS;
      return {
        allowed: false,
        reason: "hourly",
        retryAfterSeconds,
        message: `You can email responses once per hour for this quiz. Try again in ${formatRetry(retryAfterSeconds)}.`,
      };
    }

    const dailyUsed = Number((await redisClient.get(dayKey)) ?? 0) || 0;
    if (dailyUsed >= RESPONSES_EMAIL_DAILY_LIMIT) {
      const ttl = await redisClient.ttl(dayKey);
      const retryAfterSeconds = ttl > 0 ? ttl : DAY_SECONDS;
      return {
        allowed: false,
        reason: "daily",
        retryAfterSeconds,
        message: `Daily limit reached: ${RESPONSES_EMAIL_DAILY_LIMIT} response emails per day. Try again in ${formatRetry(retryAfterSeconds)}.`,
      };
    }

    const nextDailyCount = await redisClient.incr(dayKey);
    if (nextDailyCount === 1) {
      await redisClient.expire(dayKey, DAY_SECONDS);
    }
    await redisClient.setEx(hourKey, HOUR_SECONDS, "1");

    return {
      allowed: true,
      release: async () => {
        try {
          await redisClient.del(hourKey);
          const remaining = await redisClient.decr(dayKey);
          if (remaining <= 0) {
            await redisClient.del(dayKey);
          }
        } catch (error) {
          console.error("Failed to release response email quota:", error);
        }
      },
    };
  } catch (error) {
    // Do not block a legitimate email because the rate-limit store is down.
    console.error("Response email rate limit unavailable:", error);
    return { allowed: true, release: async () => {} };
  }
}
