// Shared ioredis connection for BullMQ (Queue + Worker).
// BullMQ needs a dedicated RESP connection, so it does not reuse the node-redis
// client from config/redis.ts. Configure via REDIS_URL
// (e.g. the self-hosted redis://127.0.0.1:6379 on the VPS).
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
    // Fail fast for the web process so submit can use durable recovery.
    connectTimeout: 5000,
    retryStrategy: (times: number) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    },
  });
  connection.on("ready", () => {
    console.log("[bullmq] Redis connected");
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

/** Close the shared BullMQ connection during graceful shutdown. */
export async function closeBullmqConnection(): Promise<void> {
  const connection = global.__bullmqRedis;
  if (!connection) return;
  global.__bullmqRedis = undefined;
  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
}
