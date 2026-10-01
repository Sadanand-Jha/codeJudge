// PostgreSQL connection pool — Serverless-optimized for Vercel.
// Reuses pool across warm invocations via globalThis to prevent
// "remaining connection slots are reserved for roles with the SUPERUSER attribute"
import 'dotenv/config';
import pg from 'pg';
import dns from 'dns';

const { Pool } = pg;

// Prefer a transaction-pooler URL in serverless deployments. A direct
// DATABASE_URL gives every warm function its own physical Postgres connection,
// which can exhaust small Supabase/Neon plans even when every client is
// correctly released back to its local pool.
const connectionString =
  process.env.DATABASE_POOL_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

dns.setDefaultResultOrder('ipv4first');
process.env.TZ = 'Asia/Kolkata';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

// 1. Global Instance Caching: Vercel reuses globalThis across warm lambdas.
//    Without this, every request creates a new Pool => connection exhaustion.
function createPool(): pg.Pool {
  const pool = new Pool({
    ...(connectionString ? { connectionString } : {}),
    ssl: connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }, // Required for Neon/Supabase/RDS on Vercel
    // 2. Limit Pool Size: max 1 per container — Vercel spawns many containers, each holding 1 conn
    max: 1,
    // 3. Timeout Configs: close idle quickly, fail fast on connect
    idleTimeoutMillis: 10000, // 10s — close idle client quickly (was 30000)
    connectionTimeoutMillis: 5000, // 5s — fail fast if DB unreachable (was 10000)
    query_timeout: 35000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 15000,
    application_name: 'codejudge-api',
    maxLifetimeSeconds: 300,
    allowExitOnIdle: false, // keep event loop alive in dev, Vercel freezes anyway
  });

  // Set IST timezone for every new connection
  pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Asia/Kolkata'").catch(() => {});
  });

  // 4. Error Handling: prevent zombie/idle connections from hanging
  pool.on('error', (err: Error) => {
    // Idle client error — pg will remove it, we just log (don't recreate pool here)
    console.error('Unexpected pg pool idle client error:', err.message);
  });

  // Optional: log when a client is removed to observe churn in Vercel logs
  pool.on('remove', () => {
    // console.debug('pg client removed');
  });

  return pool;
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.DATABASE_URL &&
  !process.env.DATABASE_POOL_URL &&
  !process.env.POSTGRES_PRISMA_URL
) {
  console.warn(
    '⚠️ DATABASE_POOL_URL is not configured. Serverless functions are using a direct Postgres connection; configure the provider transaction-pooler URL to prevent connection-slot exhaustion.'
  );
}

// Singleton — reuse if already on globalThis (warm invocation)
function getPool(): pg.Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool();
    // Do NOT eagerly query SELECT 1 here — that would open a connection on every cold start
    // even for health checks. Let first real query lazily open it.
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ PostgreSQL pool initialized (serverless global cache, max=1)');
    }
  }
  return global.__pgPool;
}

export const pool: pg.Pool = getPool();

const TRANSIENT_DATABASE_CODES = new Set([
  '53300', // too_many_connections
  '57P03', // cannot_connect_now
  '08000', '08001', '08003', '08004', '08006', '08007', '08P01',
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
]);

export function isTransientDatabaseError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = String(candidate?.code || '');
  const message = String(candidate?.message || '').toLowerCase();
  return TRANSIENT_DATABASE_CODES.has(code)
    || message.includes('remaining connection slots')
    || message.includes('connection terminated unexpectedly');
}

/**
 * Retry only short-lived connection/capacity failures. Business/query errors
 * are returned immediately, and the retry count stays deliberately small so
 * a saturated serverless database is not amplified by the API.
 */
export async function withTransientDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 300));
    return operation();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW() AS current_time');
    console.log('✅ Database connection successful! DB Time:', res.rows[0].current_time);
    return true;
  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
  // NOTE: Do NOT call pool.end() — serverless must keep pool alive for reuse
}

// 4. Safety: ensure unhandled pool errors don't crash lambda without logging
if (typeof process !== 'undefined' && process.on) {
  // Avoid MaxListeners warning in case of hot reload
  process.removeAllListeners('unhandledRejection');
  process.on('unhandledRejection', (reason: any) => {
    if (reason?.message?.includes('remaining connection slots') || reason?.code === '53300') {
      console.error('❌ PG connection slots exhausted:', reason.message);
    }
  });
}

export default pool;
