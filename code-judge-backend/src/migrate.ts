#!/usr/bin/env tsx

/**
 * Migration Runner
 * 
 * Reads .sql files from database/migrations/, checks the schema_migration
 * tracking table, and applies only those migrations that haven't been run yet.
 * 
 * Usage:
 *   npm run migrate          — Apply pending migrations
 *   npm run migration:dry    — Show pending migrations without applying
 *   npx tsx src/migrate.ts --dry-run
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'database', 'migrations');
const TRACKING_TABLE = 'schema_migration';

// ──────────────────────────────────────────────
// 1. Database connection
// ──────────────────────────────────────────────
const pool = new Pool();

// ──────────────────────────────────────────────
// 2. Tracking table management
// ──────────────────────────────────────────────
async function ensureTrackingTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checksum    TEXT NOT NULL
    );
  `);
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    `SELECT filename FROM ${TRACKING_TABLE} ORDER BY filename`,
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function recordMigration(
  client: pg.PoolClient,
  filename: string,
  checksum: string,
): Promise<void> {
  await client.query(
    `INSERT INTO ${TRACKING_TABLE} (filename, checksum) VALUES ($1, $2)`,
    [filename, checksum],
  );
}

// ──────────────────────────────────────────────
// 3. Run a single migration file
// ──────────────────────────────────────────────
async function runMigration(
  client: pg.PoolClient,
  filepath: string,
  filename: string,
): Promise<void> {
  const sql = fs.readFileSync(filepath, 'utf-8');
  const checksum = computeChecksum(sql);

  console.log(`  → Running migration: ${filename}`);

  // Execute the SQL
  await client.query(sql);

  // Record in tracking table
  await recordMigration(client, filename, checksum);

  console.log(`  ✓ ${filename} applied successfully`);
}

// ──────────────────────────────────────────────
// 4. Checksum helper
// ──────────────────────────────────────────────
function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// ──────────────────────────────────────────────
// 5. Main orchestrator
// ──────────────────────────────────────────────
async function migrate(dryRun: boolean = false): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  byteclash – Database Migration');
  console.log('═══════════════════════════════════════\n');

  // Ensure migrations directory exists
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`✗ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  // Read and sort migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('  No migration files found.\n');
    await pool.end();
    return;
  }

  console.log(`  Found ${files.length} migration file(s):`);
  files.forEach((f) => console.log(`    • ${f}`));
  console.log('');

  const client = await pool.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create tracking table if it doesn't exist
    await ensureTrackingTable(client);

    // Get already-applied migrations
    const applied = await getAppliedMigrations(client);

    // Filter out already-applied migrations
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('  ✓ All migrations are already up to date.\n');
      await client.query('COMMIT');
      return;
    }

    console.log(`  ${pending.length} migration(s) pending:\n`);

    if (dryRun) {
      console.log(`  [DRY RUN] ${pending.length} migration(s) would be applied:\n`);
      for (const file of pending) {
        const filepath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filepath, 'utf-8');
        const checksum = computeChecksum(sql);

        // Extract table names from CREATE TABLE statements for display
        const tables = sql
          .split('\n')
          .filter((line) => line.trim().toUpperCase().startsWith('CREATE TABLE'))
          .map((line) => {
            const match = line.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i)
                      ?? line.match(/CREATE\s+TABLE\s+(\w+)/i);
            return match ? match[1] : '?';
          });

        console.log(`  → ${file}`);
        console.log(`    Tables: ${tables.join(', ') || '(none)'}`);
        console.log(`    Checksum: ${checksum}\n`);
      }
      console.log(`  Run "npm run migrate" to apply these ${pending.length} migration(s).\n`);
      await client.query('ROLLBACK');
      return;
    }

    // Run each pending migration
    for (const file of pending) {
      const filepath = path.join(MIGRATIONS_DIR, file);
      await runMigration(client, filepath, file);
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log(`\n  ✓ ${pending.length} migration(s) applied successfully.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n  ✗ Migration failed, all changes rolled back.\n');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// ──────────────────────────────────────────────
// 6. Entry point
// ──────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run');
migrate(isDryRun);
