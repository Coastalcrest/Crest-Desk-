/**
 * CrestDesk Database Seed Runner
 *
 * Runs all SQL seed files in order. Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx seeds/index.ts
 *
 * Environment: DATABASE_URL must be set.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { createTestUsers } from './create-test-users';

const SEED_FILES = [
  'compliance-rules.sql',
  'state-signing-rules.sql',
  'oregon-forms.sql',
  'demo-data.sql',
];

async function runSeeds() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database');

    for (const file of SEED_FILES) {
      const filePath = join(__dirname, file);
      console.log(`\nRunning ${file}...`);

      try {
        const sql = readFileSync(filePath, 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`   ${file} — success`);
      } catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        console.error(`   ${file} — failed: ${message}`);
        // Continue with next file instead of aborting
      }
    }

    // Update demo users with real password hashes
    console.log('\nSetting demo user passwords...');
    await createTestUsers();

    console.log('\nSeed runner complete');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeeds();
