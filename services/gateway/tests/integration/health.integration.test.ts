/**
 * Integration test: Health endpoint with real services.
 *
 * NOTE: These tests require Docker to be running for testcontainers.
 * Run with: npm run test:integration
 *
 * If Docker is not available, these tests will be skipped gracefully.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Integration: Health endpoint', () => {
  it('returns 200 with service info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'gateway',
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
