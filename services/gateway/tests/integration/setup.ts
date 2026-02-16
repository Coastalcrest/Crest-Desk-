/**
 * Integration test setup — starts testcontainers for PostgreSQL and Redis.
 *
 * These run REAL database operations with a throwaway PostgreSQL instance.
 */
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

// Set required env vars before any app code loads
process.env.JWT_SECRET = 'integration-test-secret-key-must-be-at-least-32-chars';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DD_TRACE_ENABLED = 'false';
process.env.CORS_ORIGIN = '*';

export async function setup() {
  console.log('Starting PostgreSQL container...');
  pgContainer = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'crestdesk',
      POSTGRES_PASSWORD: 'crestdesk_test',
      POSTGRES_DB: 'crestdesk_test',
    })
    .withExposedPorts(5432)
    .start();

  const pgPort = pgContainer.getMappedPort(5432);
  const pgHost = pgContainer.getHost();
  process.env.DATABASE_URL = `postgresql://crestdesk:crestdesk_test@${pgHost}:${pgPort}/crestdesk_test`;

  console.log('Starting Redis container...');
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const redisPort = redisContainer.getMappedPort(6379);
  const redisHost = redisContainer.getHost();
  process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;

  console.log(`PostgreSQL: ${pgHost}:${pgPort}`);
  console.log(`Redis: ${redisHost}:${redisPort}`);
}

export async function teardown() {
  if (pgContainer) {
    await pgContainer.stop();
    console.log('PostgreSQL container stopped');
  }
  if (redisContainer) {
    await redisContainer.stop();
    console.log('Redis container stopped');
  }
}
