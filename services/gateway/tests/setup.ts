/**
 * Global test setup — runs before all test files.
 * Sets environment variables required by the app.
 */

// JWT_SECRET must be >= 32 chars
process.env.JWT_SECRET = 'test-secret-key-for-vitest-must-be-at-least-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.GATEWAY_PORT = '0'; // Don't bind a real port
process.env.CORS_ORIGIN = '*';

// Disable Datadog tracing in tests
process.env.DD_TRACE_ENABLED = 'false';
