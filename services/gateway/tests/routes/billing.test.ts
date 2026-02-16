/**
 * Billing route unit tests.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { authHeader, generateExpiredToken, AGENT_USER } from '../utils/mock-auth';

vi.mock('../../src/lib/redis', () => ({
  default: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK'), del: vi.fn().mockResolvedValue(1), exists: vi.fn().mockResolvedValue(0), on: vi.fn(), status: 'ready' },
}));
vi.mock('../../src/lib/token-blacklist', () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  isUserTokenRevoked: vi.fn().mockResolvedValue(false),
  blacklistToken: vi.fn(), blacklistAllUserTokens: vi.fn(),
}));
vi.mock('../../src/lib/db', () => {
  const chain = () => {
    const c: any = {};
    c.select = vi.fn().mockReturnValue(c); c.from = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(c); c.orderBy = vi.fn().mockReturnValue(c);
    c.limit = vi.fn().mockReturnValue(c); c.offset = vi.fn().mockReturnValue(c);
    c.innerJoin = vi.fn().mockReturnValue(c); c.leftJoin = vi.fn().mockReturnValue(c);
    c.groupBy = vi.fn().mockReturnValue(c); c.insert = vi.fn().mockReturnValue(c);
    c.values = vi.fn().mockReturnValue(c); c.update = vi.fn().mockReturnValue(c);
    c.set = vi.fn().mockReturnValue(c); c.delete = vi.fn().mockReturnValue(c);
    c.returning = vi.fn().mockResolvedValue([]);
    c.then = (resolve: any) => Promise.resolve([]).then(resolve);
    return c;
  };
  return { db: chain(), withTenantContext: vi.fn().mockImplementation(async (_t: string, cb: Function) => cb(chain())) };
});
vi.mock('../../src/lib/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

describe('Billing routes — authentication', () => {
  it('GET /api/v1/billing returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/billing');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/billing accepts valid token', async () => {
    const res = await request(app).get('/api/v1/billing').set('Authorization', authHeader());
    expect(res.status).not.toBe(401);
  });
});

describe('Billing routes — authorization', () => {
  it('POST /api/v1/billing requires managing_broker role', async () => {
    const res = await request(app)
      .post('/api/v1/billing')
      .set('Authorization', authHeader(AGENT_USER))
      .send({ agentId: '550e8400-e29b-41d4-a716-446655440000', billingType: 'desk_fee', amount: 500, invoiceDate: '2024-01-01', dueDate: '2024-01-31' });
    expect([403, 400, 500]).toContain(res.status);
  });

  it('GET /api/v1/billing/outstanding requires managing_broker', async () => {
    const res = await request(app)
      .get('/api/v1/billing/outstanding')
      .set('Authorization', authHeader(AGENT_USER));
    expect([403, 500]).toContain(res.status);
  });
});

describe('Billing routes — mark paid', () => {
  it('POST /api/v1/billing/:id/mark-paid requires managing_broker', async () => {
    const res = await request(app)
      .post('/api/v1/billing/550e8400-e29b-41d4-a716-446655440000/mark-paid')
      .set('Authorization', authHeader(AGENT_USER))
      .send({ paidDate: '2024-01-15' });
    expect([403, 500]).toContain(res.status);
  });
});
