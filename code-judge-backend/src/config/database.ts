// PostgreSQL connection pool with Serverless caching.
// Uses globalThis to reuse pool across Vercel serverless invocations.
// Prevents "too many clients" errors from creating new Pool per request.
import 'dotenv/config';
import pg from 'pg';
import dns from 'dns';

const { Pool } = pg;

dns.setDefaultResultOrder('ipv4first');
process.env.TZ = 'Asia/Kolkata';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
  var __pgPoolPromise: Promise<pg.Pool> | undefined;
}

// Serverless-optimized pool singleton
function createPool(): pg.Pool {
  const pool = new Pool({
    // pg will auto-read PGHOST/PGUSER/DATABASE_URL from env if not provided
    // Explicitly pass DATABASE_URL if available for Vercel
    ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}),
    ssl: {
      rejectUnauthorized: false, // Required for Neon/Supabase/RDS on Vercel
    },
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Set IST timezone for every new connection
  pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Asia/Kolkata'").catch(() => {});
  });

  pool.on('error', (err) => {
    console.error('Unexpected pg pool error', err);
  });

  return pool;
}

// Reuse existing pool if already created (Vercel caches global across warm invocations)
export const pool: pg.Pool = global.__pgPool ?? createPool();

if (!global.__pgPool) {
  global.__pgPool = pool;
  // Optional: test connection once on cold start (non-blocking, don't close pool)
  // Only log, don't crash if DB unreachable (Vercel build stage may not have DB)
  pool.query('SELECT 1')
    .then(() => console.log('✅ PostgreSQL pool initialized (serverless cache enabled)'))
    .catch((err) => console.warn('⚠️ PostgreSQL pool init warning (will retry on request):', err.message));
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
  // NOTE: Do NOT call pool.end() here — in serverless we must keep pool alive for reuse
}

export default pool;
