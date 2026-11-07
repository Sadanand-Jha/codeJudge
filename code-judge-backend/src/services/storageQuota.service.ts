import type { Pool, PoolClient } from "pg";
import pool from "../config/database.ts";
import { getEntitlements } from "./entitlement.service.ts";

const BYTES_PER_MB = 1024 * 1024;
const STORAGE_UPGRADE_URL = "/pricing";

export function exceedsStorageLimit(
  usedBytes: number,
  additionalBytes: number,
  limitMB: number
): boolean {
  return limitMB !== -1 && usedBytes + additionalBytes > limitMB * BYTES_PER_MB;
}

export class StorageLimitExceededError extends Error {
  readonly limitMB: number;
  readonly usedMB: number;
  readonly upgradeUrl = STORAGE_UPGRADE_URL;

  constructor(limitMB: number, usedBytes: number) {
    const usedMB = Math.ceil(usedBytes / BYTES_PER_MB);
    super(
      `You have used ${usedMB} MB of your ${limitMB} MB storage. Upgrade to a monthly plan to upload more files.`
    );
    this.name = "StorageLimitExceededError";
    this.limitMB = limitMB;
    this.usedMB = usedMB;
  }
}

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export async function lockTeacherStorage(client: PoolClient, userId: number): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`teacher-storage:${userId}`]);
}

export async function assertStorageCapacity(
  userId: number,
  additionalBytes: number,
  executor: Queryable = pool
): Promise<void> {
  if (!Number.isSafeInteger(additionalBytes) || additionalBytes < 0) {
    throw new TypeError("Additional storage bytes must be a non-negative safe integer.");
  }

  const entitlements = await getEntitlements(userId);
  const limitMB = entitlements.values.storage_mb;
  if (typeof limitMB !== "number" || limitMB === -1) return;

  const usage = await executor.query<{ bytes: string }>(
    `SELECT (
       COALESCE((SELECT SUM(bytes) FROM letterhead_templates WHERE user_id = $1), 0) +
       COALESCE((SELECT SUM(bytes) FROM room_documents WHERE uploaded_by = $1), 0)
     )::text AS bytes`,
    [userId]
  );
  const usedBytes = Number(usage.rows[0]?.bytes ?? 0);
  if (exceedsStorageLimit(usedBytes, additionalBytes, limitMB)) {
    throw new StorageLimitExceededError(limitMB, usedBytes);
  }
}
