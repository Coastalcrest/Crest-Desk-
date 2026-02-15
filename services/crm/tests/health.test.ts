import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

describe('CRM Service', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
