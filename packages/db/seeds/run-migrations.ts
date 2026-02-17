/**
 * CrestDesk Database Migration Runner
 *
 * Runs all hand-written SQL migration files in order.
 * Tracks applied migrations in a _migrations table to avoid re-running.
 *
 * Usage: npx tsx seeds/run-migrations.ts
 * Environment: DATABASE_URL must be set.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

async function runMigrations() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://crestdesk:crestdesk_dev@localhost:5432/crestdesk';

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query('SELECT name FROM _migrations ORDER BY name');
    const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

    // Read migration files sorted by name (0001, 0002, ...)
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files, ${appliedSet.size} already applied\n`);

    let newCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue; // already applied
      }

      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`   ✓ ${file}`);
        newCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        const message = err instanceof Error ? err.message : String(err);
        console.error(`   ✗ ${file} — ${message}`);
        console.error('   Stopping migration run.');
        process.exit(1);
      }
    }

    if (newCount === 0) {
      console.log('All migrations already applied — nothing to do.');
    } else {
      console.log(`\nApplied ${newCount} new migration(s).`);
    }
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
