/**
 * Integration test: Authentication flow.
 *
 * Tests the JWT token lifecycle:
 * - Generate tokens
 * - Use tokens to access protected endpoints
 * - Token expiration
 *
 * NOTE: These tests use mocked DB since real DB requires migrations.
 * Full DB integration tests would run after migration setup.
 */
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/index';

const TEST_SECRET = process.env.JWT_SECRET!;

// Mock DB and Redis for auth flow testing
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

describe('Integration: JWT Auth Flow', () => {
  function makeToken(overrides: Record<string, any> = {}) {
    return jwt.sign(
      {
        sub: 'user-integration-1',
        tid: 'tenant-integration-1',
        role: 'managing_broker',
        perms: ['transactions:read', 'contacts:read'],
        jti: 'jti-integration-1',
        ...overrides,
      },
      TEST_SECRET,
      { expiresIn: '15m', issuer: 'crestdesk', audience: 'crestdesk-api' },
    );
  }

  it('rejects requests without authorization header', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects expired tokens', async () => {
    const token = jwt.sign(
      { sub: 'u', tid: 't', role: 'agent', perms: [], jti: 'j' },
      TEST_SECRET,
      { expiresIn: '-1s', issuer: 'crestdesk', audience: 'crestdesk-api' },
    );
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('rejects tokens with wrong issuer', async () => {
    const token = jwt.sign(
      { sub: 'u', tid: 't', role: 'agent', perms: [], jti: 'j' },
      TEST_SECRET,
      { expiresIn: '15m', issuer: 'wrong-issuer', audience: 'crestdesk-api' },
    );
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('accepts valid token and passes to route handler', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);
    // Should get past auth — either 200 or 500 from mock DB, but NOT 401
    expect(res.status).not.toBe(401);
  });

  it('handles multiple routes with same token', async () => {
    const token = makeToken();
    const header = `Bearer ${token}`;

    const [r1, r2, r3] = await Promise.all([
      request(app).get('/api/v1/transactions').set('Authorization', header),
      request(app).get('/api/v1/contacts').set('Authorization', header),
      request(app).get('/health'),
    ]);

    expect(r1.status).not.toBe(401);
    expect(r2.status).not.toBe(401);
    expect(r3.status).toBe(200);
  });
});
