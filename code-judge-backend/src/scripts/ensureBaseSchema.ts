import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { resolveDatabaseSsl } from '../config/databaseSsl.ts';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'database', 'migrations');
const INIT_FILE = path.join(MIGRATIONS_DIR, 'init.sql');

function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(16);
}

async function connectWithRetry(pool: pg.Pool): Promise<pg.PoolClient> {
  const attempts = 30;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt === attempts) throw error;
      console.log(`Database not ready (attempt ${attempt}/${attempts}); retrying in 2s.`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Unreachable');
}

async function ensureBaseSchema(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: resolveDatabaseSsl(databaseUrl),
    connectionTimeoutMillis: 5000,
    application_name: 'quizsupport-migrate',
  });

  const client = await connectWithRetry(pool);
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        id          SERIAL PRIMARY KEY,
        filename    VARCHAR(255) UNIQUE NOT NULL,
        applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum    TEXT NOT NULL
      );
    `);

    const baseTable = await client.query<{ reg: string | null }>(
      "SELECT to_regclass('public.quiz')::text AS reg",
    );
    const hasBaseSchema = Boolean(baseTable.rows[0]?.reg);
    const recorded = await client.query(
      'SELECT 1 FROM schema_migration WHERE filename = $1',
      ['init.sql'],
    );
    const sql = fs.readFileSync(INIT_FILE, 'utf-8');
    const checksum = computeChecksum(sql);

    if (hasBaseSchema) {
      if (recorded.rowCount === 0) {
        await client.query(
          'INSERT INTO schema_migration (filename, checksum) VALUES ($1, $2)',
          ['init.sql', checksum],
        );
        console.log('Base schema found; recorded init.sql as already applied.');
      } else {
        console.log('Base schema and init.sql record already present.');
      }
    } else {
      console.log('Fresh database; applying init.sql base schema.');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migration (filename, checksum) VALUES ($1, $2)',
        ['init.sql', checksum],
      );
      console.log('init.sql applied and recorded.');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

ensureBaseSchema().catch((error) => {
  console.error('Base schema bootstrap failed:', error);
  process.exit(1);
});
