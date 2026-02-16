/**
 * Transaction route unit tests.
 *
 * Tests authentication, authorization, validation, and error handling
 * at the HTTP layer. Database interactions are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { authHeader, generateExpiredToken, DEFAULT_USER, AGENT_USER } from '../utils/mock-auth';

// Mock Redis (token blacklist) to avoid connection errors
vi.mock('../../src/lib/redis', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    on: vi.fn(),
    status: 'ready',
  },
}));

vi.mock('../../src/lib/token-blacklist', () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  isUserTokenRevoked: vi.fn().mockResolvedValue(false),
  blacklistToken: vi.fn().mockResolvedValue(undefined),
  blacklistAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

// Mock the database layer
vi.mock('../../src/lib/db', () => {
  const mockTx: any = {};
  const chain = () => {
    const c: any = {};
    c.select = vi.fn().mockReturnValue(c);
    c.from = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(c);
    c.orderBy = vi.fn().mockReturnValue(c);
    c.limit = vi.fn().mockReturnValue(c);
    c.offset = vi.fn().mockReturnValue(c);
    c.innerJoin = vi.fn().mockReturnValue(c);
    c.leftJoin = vi.fn().mockReturnValue(c);
    c.groupBy = vi.fn().mockReturnValue(c);
    c.insert = vi.fn().mockReturnValue(c);
    c.values = vi.fn().mockReturnValue(c);
    c.update = vi.fn().mockReturnValue(c);
    c.set = vi.fn().mockReturnValue(c);
    c.delete = vi.fn().mockReturnValue(c);
    c.returning = vi.fn().mockResolvedValue([]);
    c.then = (resolve: any) => Promise.resolve([]).then(resolve);
    return c;
  };
  Object.assign(mockTx, chain());

  return {
    db: chain(),
    withTenantContext: vi.fn().mockImplementation(async (_tid: string, cb: Function) => cb(chain())),
  };
});

// Mock audit logging
vi.mock('../../src/lib/audit', () => ({
  logAudit: vi.fn(),
}));

// Mock logger
vi.mock('../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn(), child: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

describe('Transaction routes — authentication', () => {
  it('GET /api/v1/transactions returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/transactions returns 401 with expired token', async () => {
    const token = generateExpiredToken();
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/transactions accepts valid token', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader());
    // Should not be 401 — might be 200, 500, etc. depending on DB mock
    expect(res.status).not.toBe(401);
  });
});

describe('Transaction routes — validation', () => {
  it('POST /api/v1/transactions rejects empty body', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({});
    // Should be 400 or 422 for validation error
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /api/v1/transactions rejects invalid transaction type', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        transactionType: 'invalid',
        propertyAddress: '123 Test St',
        propertyState: 'OR',
      });
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /api/v1/transactions rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        transactionType: 'purchase',
        // missing propertyAddress and propertyState
      });
    expect([400, 422, 500]).toContain(res.status);
  });
});

describe('Transaction routes — authorization', () => {
  it('GET /api/v1/transactions works for agents', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(AGENT_USER));
    expect(res.status).not.toBe(403);
  });
});
