import { pool } from "../config/database.ts";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CLEANUP_LOCK_ID = 2_704_202;
const DELETE_BATCH_SIZE = 5_000;

let lastCleanupAt = 0;
let cleanupRunning = false;

/**
 * Opportunistic retention cleanup. It is triggered by normal API traffic,
 * guarded across instances with a PostgreSQL advisory lock, and deletes in
 * bounded batches so observability can never monopolize the database.
 */
export async function runObservabilityRetentionCleanup(): Promise<void> {
  const now = Date.now();
  if (cleanupRunning || now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  cleanupRunning = true;
  lastCleanupAt = now;

  const client = await pool.connect();
  let locked = false;
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock($1) AS locked", [CLEANUP_LOCK_ID]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) return;

    const previousRun = await client.query<{ recently_ran: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM system_metrics
         WHERE metric_name = 'observability_retention_cleanup'
           AND recorded_at >= NOW() - INTERVAL '6 hours'
       ) AS recently_ran`
    );
    if (previousRun.rows[0]?.recently_ran === true) return;

    // Routine healthy traffic has little debugging value after one week.
    // Failures and diagnostic ledgers are retained substantially longer.
    await client.query(
      `DELETE FROM api_request_logs WHERE id IN (
         SELECT id FROM api_request_logs
         WHERE success = TRUE AND status_code < 400 AND created_at < NOW() - INTERVAL '7 days'
         ORDER BY created_at LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `DELETE FROM api_request_logs WHERE id IN (
         SELECT id FROM api_request_logs
         WHERE success = FALSE AND created_at < NOW() - INTERVAL '30 days'
         ORDER BY created_at LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `DELETE FROM system_metrics WHERE ctid IN (
         SELECT ctid FROM system_metrics WHERE recorded_at < NOW() - INTERVAL '30 days' LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `DELETE FROM user_activity_logs WHERE id IN (
         SELECT id FROM user_activity_logs WHERE created_at < NOW() - INTERVAL '90 days' ORDER BY created_at LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `DELETE FROM ai_request_logs WHERE id IN (
         SELECT id FROM ai_request_logs
         WHERE created_at < NOW() - CASE WHEN success THEN INTERVAL '30 days' ELSE INTERVAL '90 days' END
         ORDER BY created_at LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `DELETE FROM application_errors WHERE id IN (
         SELECT id FROM application_errors
         WHERE (resolved_at IS NOT NULL AND resolved_at < NOW() - INTERVAL '30 days')
            OR last_seen_at < NOW() - INTERVAL '90 days'
         ORDER BY last_seen_at LIMIT $1
       )`,
      [DELETE_BATCH_SIZE]
    );
    await client.query(
      `INSERT INTO system_metrics (metric_name, metric_value, unit, metadata)
       VALUES ('observability_retention_cleanup', 1, 'run', $1)`,
      [{ healthyRequestDays: 7, failedRequestDays: 30, errorDays: 90 }]
    );
  } catch (error) {
    console.warn("[observability-retention] cleanup skipped:", (error as Error).message);
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock($1)", [CLEANUP_LOCK_ID]).catch(() => undefined);
    client.release();
    cleanupRunning = false;
  }
}
