// Shared ioredis connection for BullMQ (Queue + Worker).
// NOTE: BullMQ needs a real Redis over RESP — the Upstash REST client in
// config/redis.ts cannot be used here. Configure via REDIS_URL
// (e.g. local redis://127.0.0.1:6379 or a hosted RESP endpoint).
// On serverless (Vercel) there is no long-lived worker; the submit endpoint
// falls back to inline processing when the queue is unreachable.
import { Redis } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __bullmqRedis: Redis | undefined;
  // eslint-disable-next-line no-var
  var __bullmqWorkerStarted: boolean | undefined;
}

function createConnection(): Redis {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const connection = new Redis(url, {
    // Required by BullMQ workers (blocking commands must not time out).
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // Fail fast for the web process so submit can fall back to inline grading.
    connectTimeout: 5000,
    retryStrategy: (times: number) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    },
  });
  connection.on("error", (err: Error) => {
    console.error("[bullmq] redis connection error:", err.message);
  });
  return connection;
}

export function getBullmqConnection(): Redis {
  if (!global.__bullmqRedis) {
    global.__bullmqRedis = createConnection();
  }
  return global.__bullmqRedis;
}
