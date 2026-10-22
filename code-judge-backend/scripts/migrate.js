import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

// .env file se variables load karne ke liye
dotenv.config();

const { Pool } = pkg;

// Alag-alag credentials yahan set karein (ya .env file mein daal kar process.env se lein)
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'your_PGuser',
  password: process.env.PGPASSWORD || 'your_PGpassword',
  // database: process.env.PGNAME || 'your_PGname',
  port: process.env.PGPORT || 5432,
});

const dbDir = path.resolve('database/migrations');

async function runMigration() {
  const targetFile = process.argv[2];

  if (!targetFile) {
    console.error('❌ Error: Please specify a migration file name.');
    console.log('💡 Usage: npm run migrate <filename>');
    process.exit(1);
  }

  const filePath = path.join(dbDir, targetFile);

  try {
    await fs.access(filePath);
  } catch {
    console.error(`❌ Error: File '${targetFile}' not found in the 'database/' directory.`);
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log(`🚀 Running migration: ${targetFile}`);

    if (targetFile.endsWith('.sql')) {
      const sqlQuery = await fs.readFile(filePath, 'utf8');
      await client.query(sqlQuery);
      console.log(`✅ Successfully executed SQL file: ${targetFile}`);

    } else if (targetFile.endsWith('.js')) {
      const fileUrl = pathToFileURL(filePath).href;
      const migration = await import(fileUrl);
      
      if (typeof migration.up === 'function') {
        await migration.up(client);
        console.log(`✅ Successfully completed JS migration: ${targetFile}`);
      } else {
        console.warn(`⚠️ Skipping ${targetFile}: No 'up' function exported.`);
      }
    } else {
      console.error(`❌ Unsupported file format for: ${targetFile}`);
    }

  } catch (error) {
    console.error(`❌ Migration failed for ${targetFile}:`, error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();