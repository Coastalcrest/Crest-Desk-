import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

describe('Health endpoints', () => {
  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('crestdesk-billing');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.paymentProvider).toBeDefined();
  });

  it('GET /health/live returns alive', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('GET /health/ready returns ready', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});
