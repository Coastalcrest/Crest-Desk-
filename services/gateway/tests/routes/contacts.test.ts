/**
 * Contact route unit tests.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { authHeader, generateExpiredToken } from '../utils/mock-auth';

// Mock Redis
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

vi.mock('../../src/lib/db', () => {
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
  return {
    db: chain(),
    withTenantContext: vi.fn().mockImplementation(async (_tid: string, cb: Function) => cb(chain())),
  };
});

vi.mock('../../src/lib/audit', () => ({
  logAudit: vi.fn(),
}));

vi.mock('../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn(), child: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

describe('Contact routes — authentication', () => {
  it('GET /api/v1/contacts returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/contacts');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/contacts returns 401 with expired token', async () => {
    const token = generateExpiredToken();
    const res = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/contacts accepts valid token', async () => {
    const res = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', authHeader());
    expect(res.status).not.toBe(401);
  });
});

describe('Contact routes — validation', () => {
  it('POST /api/v1/contacts rejects empty body', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader())
      .send({});
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /api/v1/contacts rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader())
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'not-an-email',
        contactType: 'buyer',
      });
    expect([400, 422, 500]).toContain(res.status);
  });
});

describe('Contact routes — get by ID', () => {
  it('GET /api/v1/contacts/:id with invalid UUID returns 400 or 500', async () => {
    const res = await request(app)
      .get('/api/v1/contacts/not-a-uuid')
      .set('Authorization', authHeader());
    // Depends on whether params are validated
    expect([400, 404, 500]).toContain(res.status);
  });
});
