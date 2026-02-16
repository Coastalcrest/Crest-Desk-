/**
 * Health endpoint tests — no auth required.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('gateway');
    expect(res.body.timestamp).toBeDefined();
  });
});
