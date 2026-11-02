// Redis client setup (node-redis over RESP) for the self-hosted VPS instance.
// Configure via REDIS_URL (defaults to localhost).
// Used for OTPs, sessions, rate limits, caching, and quiz recovery payloads.
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";

function createRedisClient() {
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis Client Error", err));
  return client;
}

type RawRedis = ReturnType<typeof createRedisClient>;

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RawRedis | undefined;
  var __redisWrapper: RedisCompatWrapper | undefined;
}

// Singleton via globalThis so hot reloads and serverless warm invocations reuse
// the same socket.
const rawClient: RawRedis = global.__redisClient ?? createRedisClient();
if (!global.__redisClient) global.__redisClient = rawClient;

let connectPromise: Promise<void> | null = null;

async function ensureConnected(): Promise<RawRedis> {
  if (rawClient.isOpen) return rawClient;
  if (!connectPromise) {
    connectPromise = rawClient
      .connect()
      .then(() => {
        console.log("✅ Redis connected");
      })
      .finally(() => {
        connectPromise = null;
      });
  }
  await connectPromise;
  return rawClient;
}

// ---------- Compatibility wrapper ----------
// Keeps the node-redis camelCase API used across the app and accepts the
// lowercase option shapes (`{ ex }`, `{ nx }`) used by older call sites.
class RedisCompatWrapper {
  get isOpen(): boolean {
    return rawClient.isOpen;
  }

  async connect(): Promise<void> {
    await ensureConnected();
  }

  on(...args: any[]): void {
    rawClient.on(...(args as Parameters<RawRedis["on"]>));
  }

  async get(key: string): Promise<string | null> {
    const client = await ensureConnected();
    return client.get(key);
  }

  async set(key: string, value: string, opts?: any): Promise<string | null> {
    const client = await ensureConnected();
    if (!opts || typeof opts !== "object") {
      return client.set(key, value);
    }
    const normalized: Record<string, unknown> = {};
    if (opts.EX !== undefined || opts.ex !== undefined) normalized.EX = opts.EX ?? opts.ex;
    if (opts.PX !== undefined || opts.px !== undefined) normalized.PX = opts.PX ?? opts.px;
    if (opts.NX === true || opts.nx === true) normalized.NX = true;
    if (opts.XX === true || opts.xx === true) normalized.XX = true;
    if (Object.keys(normalized).length === 0) {
      return client.set(key, value);
    }
    return client.set(key, value, normalized as any);
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    const client = await ensureConnected();
    return client.setEx(key, seconds, value);
  }

  /** Atomically read and delete a one-time value (OAuth state). */
  async getDel(key: string): Promise<string | null> {
    const client = await ensureConnected();
    return client.getDel(key);
  }

  async del(...keys: (string | string[])[]): Promise<number> {
    const client = await ensureConnected();
    const flat = keys.flat() as string[];
    if (flat.length === 0) return 0;
    return (client as any).del(flat);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const client = await ensureConnected();
    return client.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    const client = await ensureConnected();
    return client.incr(key);
  }

  async decr(key: string): Promise<number> {
    const client = await ensureConnected();
    return client.decr(key);
  }

  async ttl(key: string): Promise<number> {
    const client = await ensureConnected();
    return client.ttl(key);
  }

  async hSet(key: string, field: string | Record<string, any>, value?: any): Promise<number> {
    const client = await ensureConnected();
    if (typeof field === "object" && value === undefined) {
      return (client as any).hSet(key, field);
    }
    return (client as any).hSet(key, field as string, value);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    const client = await ensureConnected();
    return (client as any).hGet(key, field);
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    const client = await ensureConnected();
    return (client as any).hIncrBy(key, field, increment);
  }

  // Lowercase aliases for call sites that use the redis command names.
  hset = this.hSet.bind(this);
  hget = this.hGet.bind(this);
  hincrby = this.hIncrBy.bind(this);
  setex = this.setEx.bind(this);

  async quit(): Promise<void> {
    if (rawClient.isOpen) {
      await rawClient.quit();
    }
  }
}

// Export singleton wrapper (lazy connection, no top-level await).
const redisClient: RedisCompatWrapper = global.__redisWrapper ?? new RedisCompatWrapper();
if (!global.__redisWrapper) global.__redisWrapper = redisClient;

export async function getRedisClient(): Promise<RedisCompatWrapper> {
  await ensureConnected();
  return redisClient;
}

export default redisClient;
