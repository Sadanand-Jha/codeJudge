// @upstash/redis — HTTP-based Redis for Vercel Serverless
// Uses REST API (no TCP), so no persistent socket hangs on lambdas.
// Initialized via Redis.fromEnv() (reads UPSTASH_REDIS_REST_URL / TOKEN).
// Fallback to in-memory store if env missing (local dev without Upstash).

import { Redis } from "@upstash/redis";

declare global {
  // eslint-disable-next-line no-var
  var __upstashRedis: any | undefined;
  var __upstashWrapper: any | undefined;
}

// ---------- In-memory fallback for local dev / build without Upstash ----------
class MemoryRedis {
  private kv = new Map<string, { value: string; expireAt?: number }>();
  private hashes = new Map<string, Map<string, string>>();

  private isExpired(entry: { expireAt?: number } | undefined): boolean {
    return !!entry?.expireAt && Date.now() > entry.expireAt;
  }

  private getEntry(key: string): { value: string; expireAt?: number } | undefined {
    const e = this.kv.get(key);
    if (e && this.isExpired(e)) {
      this.kv.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    const e = this.getEntry(key);
    return e ? e.value : null;
  }

  async set(key: string, value: string, opts?: any): Promise<string> {
    let expireAt: number | undefined;
    if (opts?.EX ?? opts?.ex) expireAt = Date.now() + (opts.EX ?? opts.ex) * 1000;
    else if (opts?.PX ?? opts?.px) expireAt = Date.now() + (opts.PX ?? opts.px);
    this.kv.set(key, { value: String(value), expireAt });
    return "OK";
  }

  async setEx(key: string, seconds: number, value: string): Promise<string> {
    return this.set(key, value, { ex: seconds });
  }

  async del(...keys: string[]): Promise<number> {
    let c = 0;
    for (const k of keys.flat()) {
      if (this.kv.delete(k)) c++;
      if (this.hashes.delete(k)) c++;
    }
    return c;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const e = this.kv.get(key);
    const h = this.hashes.get(key);
    if (e) {
      e.expireAt = Date.now() + seconds * 1000;
      return 1;
    }
    if (h) {
      // Upstash hashes don't use expire per se, but we treat similarly
      // For memory, we store expiry in kv? simplified: not implemented
      return 1;
    }
    return 0;
  }

  async incr(key: string): Promise<number> {
    const e = this.getEntry(key);
    const cur = e ? parseInt(e.value, 10) || 0 : 0;
    const next = cur + 1;
    // preserve expiry if exists
    this.kv.set(key, { value: String(next), expireAt: e?.expireAt });
    return next;
  }

  async hset(key: string, fieldOrObj: any, value?: any): Promise<number> {
    let map = this.hashes.get(key);
    if (!map) {
      map = new Map<string, string>();
      this.hashes.set(key, map);
    }
    if (typeof fieldOrObj === "object" && value === undefined) {
      for (const [f, v] of Object.entries(fieldOrObj)) map.set(f, String(v));
      return Object.keys(fieldOrObj).length;
    }
    map.set(String(fieldOrObj), String(value));
    return 1;
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hincrby(key: string, field: string, incr: number): Promise<number> {
    let map = this.hashes.get(key);
    if (!map) {
      map = new Map<string, string>();
      this.hashes.set(key, map);
    }
    const cur = parseInt(map.get(field) || "0", 10) || 0;
    const next = cur + incr;
    map.set(field, String(next));
    return next;
  }

  // compat aliases
  hSet = this.hset;
  hGet = this.hget;
  hIncrBy = this.hincrby;

  get isOpen() {
    return true;
  }
  async connect() {}
  on() {}
  async quit() {}
}

// ---------- Factory: real Upstash or memory fallback ----------
function createUpstashClient(): any {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Try explicit env first, then fromEnv()
  if (url && token) {
    try {
      console.log("✅ Upstash Redis initialized via UPSTASH_REDIS_REST_URL (serverless HTTP)");
      return new Redis({ url, token });
    } catch (e: any) {
      console.warn("⚠️ Upstash explicit init failed:", e.message);
    }
  }

  try {
    // Will auto-read UPSTASH_REDIS_REST_URL/TOKEN or throw
    const client = Redis.fromEnv();
    console.log("✅ Upstash Redis initialized via Redis.fromEnv()");
    return client;
  } catch (e: any) {
    console.warn(
      "⚠️ UPSTASH_REDIS_REST_URL / TOKEN missing — using in-memory Redis fallback. " +
        "Set env vars on Vercel for persistence. Error: " + e.message
    );
    return new MemoryRedis();
  }
}

// Singleton via globalThis (Vercel reuses global across warm invocations)
const rawClient: any = global.__upstashRedis ?? createUpstashClient();
if (!global.__upstashRedis) global.__upstashRedis = rawClient;

// ---------- Compatibility wrapper ----------
// Translates node-redis camelCase calls (hSet/hGet/setEx) to Upstash lowercase
// and normalises option shapes {EX: ttl} → {ex: ttl}.
class RedisCompatWrapper {
  constructor(private client: any) {}

  // For old checks: `if (!client.isOpen) await client.connect()`
  get isOpen(): boolean {
    // HTTP has no socket — always open; memory also open
    if (typeof this.client.isOpen === "boolean") return this.client.isOpen;
    return true;
  }
  async connect(): Promise<void> {
    if (typeof this.client.connect === "function" && !this.isOpen) {
      try {
        await this.client.connect();
      } catch {}
    }
  }
  on(..._args: any[]) {
    // Upstash has no events — no-op for compat
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (e: any) {
      console.warn("Redis GET failed:", e.message);
      return null;
    }
  }

  async set(key: string, value: string, opts?: any): Promise<string | null> {
    try {
      if (opts && (opts.EX !== undefined || opts.ex !== undefined)) {
        const ex = opts.EX ?? opts.ex;
        return await this.client.set(key, value, { ex });
      }
      if (opts && (opts.PX !== undefined || opts.px !== undefined)) {
        const px = opts.PX ?? opts.px;
        return await this.client.set(key, value, { px });
      }
      // Upstash set supports EX/PX as third arg object, or string value
      if (opts && typeof opts === "object" && Object.keys(opts).length === 0) {
        return await this.client.set(key, value);
      }
      if (opts) return await this.client.set(key, value, opts);
      return await this.client.set(key, value);
    } catch (e: any) {
      console.warn("Redis SET failed:", e.message);
      return null;
    }
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    try {
      return await this.client.set(key, value, { ex: seconds });
    } catch (e: any) {
      console.warn("Redis SETEX failed:", e.message);
      return null;
    }
  }

  async del(...keys: (string | string[])[]): Promise<number> {
    try {
      const flat = keys.flat() as string[];
      if (flat.length === 0) return 0;
      // Upstash del can take ...keys
      return await this.client.del(...flat);
    } catch (e: any) {
      console.warn("Redis DEL failed:", e.message);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.client.expire(key, seconds);
    } catch (e: any) {
      console.warn("Redis EXPIRE failed:", e.message);
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (e: any) {
      console.warn("Redis INCR failed:", e.message);
      return 0;
    }
  }

  // Hash helpers — support both camelCase (node-redis) and lowercase (Upstash)
  async hSet(key: string, field: string | Record<string, any>, value?: any): Promise<number> {
    try {
      if (typeof field === "object" && value === undefined) {
        // hSet(key, {field: value})
        return await this.client.hset(key, field);
      }
      // hSet(key, field, value) -> Upstash expects object
      return await this.client.hset(key, { [field as string]: value });
    } catch (e: any) {
      console.warn("Redis HSET failed:", e.message);
      return 0;
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (e: any) {
      console.warn("Redis HGET failed:", e.message);
      return null;
    }
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    try {
      return await this.client.hincrby(key, field, increment);
    } catch (e: any) {
      console.warn("Redis HINCRBY failed:", e.message);
      return 0;
    }
  }

  // Lowercase aliases for code that already uses Upstash style
  hset = this.hSet.bind(this);
  hget = this.hGet.bind(this);
  hincrby = this.hIncrBy.bind(this);
  setex = this.setEx.bind(this);
}

// Export singleton wrapper (serverless-safe, no top-level connect)
const redisClient: RedisCompatWrapper = global.__upstashWrapper ?? new RedisCompatWrapper(rawClient);
if (!global.__upstashWrapper) global.__upstashWrapper = redisClient;

// Optional helper — ensures client ready (no-op for HTTP, useful for compat)
export async function getRedisClient(): Promise<RedisCompatWrapper> {
  // HTTP needs no connect; memory also ready
  return redisClient;
}

export default redisClient;
