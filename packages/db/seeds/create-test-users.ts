/**
 * Updates demo users with real argon2 password hashes so they can log in.
 *
 * Must run AFTER demo-data.sql (which creates the user rows).
 *
 * Test credentials:
 *   broker@demo.crestdesk.com  / DemoPass123!
 *   alex@demo.crestdesk.com    / DemoPass123!
 *   jordan@demo.crestdesk.com  / DemoPass123!
 *   maya@demo.crestdesk.com    / DemoPass123!
 *   office@demo.crestdesk.com  / DemoPass123!
 */
import argon2 from 'argon2';
import { Client } from 'pg';

const TEST_PASSWORD = 'DemoPass123!';

const DEMO_USER_EMAILS = [
  'broker@demo.crestdesk.com',
  'alex@demo.crestdesk.com',
  'jordan@demo.crestdesk.com',
  'maya@demo.crestdesk.com',
  'office@demo.crestdesk.com',
];

async function createTestUsers() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const hash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    for (const email of DEMO_USER_EMAILS) {
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [hash, email],
      );
      console.log(`   Updated password for ${email}`);
    }

    console.log(`\n   All demo users can now log in with: ${TEST_PASSWORD}`);
  } finally {
    await client.end();
  }
}

export { createTestUsers };
