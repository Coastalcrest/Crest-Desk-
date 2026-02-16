/**
 * Unit tests for authentication middleware.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticate, requirePermissions } from '../../src/middleware/auth';

// Mock dependencies
vi.mock('../../src/lib/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../src/lib/token-blacklist', () => ({
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
  isUserTokenRevoked: vi.fn().mockResolvedValue(false),
}));

vi.mock('../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { verifyAccessToken } from '../../src/lib/jwt';
import { isTokenBlacklisted, isUserTokenRevoked } from '../../src/lib/token-blacklist';

function createMockReqRes(authHeader?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { req, res, next } = createMockReqRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const { req, res, next } = createMockReqRes('Basic abc123');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is invalid', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      const err = new Error('invalid token');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    const { req, res, next } = createMockReqRes('Bearer invalid-token');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      }),
    );
  });

  it('returns 401 when token is expired', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });
    const { req, res, next } = createMockReqRes('Bearer expired-token');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      }),
    );
  });

  it('returns 401 when token is blacklisted', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      tid: 'tenant-1',
      role: 'agent',
      perms: [],
      jti: 'blacklisted-jti',
      iat: Math.floor(Date.now() / 1000),
    } as any);
    vi.mocked(isTokenBlacklisted).mockResolvedValue(true);

    const { req, res, next } = createMockReqRes('Bearer valid-token');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TOKEN_REVOKED' }),
      }),
    );
  });

  it('returns 401 when user tokens are revoked', async () => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      tid: 'tenant-1',
      role: 'agent',
      perms: [],
      jti: 'valid-jti',
      iat: Math.floor(Date.now() / 1000),
    } as any);
    vi.mocked(isTokenBlacklisted).mockResolvedValue(false);
    vi.mocked(isUserTokenRevoked).mockResolvedValue(true);

    const { req, res, next } = createMockReqRes('Bearer valid-token');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TOKEN_REVOKED' }),
      }),
    );
  });

  it('attaches user to request on valid token', async () => {
    const payload = {
      sub: 'user-1',
      tid: 'tenant-1',
      role: 'managing_broker',
      perms: ['transactions:read'],
      jti: 'valid-jti',
      iat: Math.floor(Date.now() / 1000),
    };
    vi.mocked(verifyAccessToken).mockReturnValue(payload as any);
    vi.mocked(isTokenBlacklisted).mockResolvedValue(false);
    vi.mocked(isUserTokenRevoked).mockResolvedValue(false);

    const { req, res, next } = createMockReqRes('Bearer valid-token');
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.sub).toBe('user-1');
    expect(req.user!.tid).toBe('tenant-1');
    expect(req.user!.role).toBe('managing_broker');
    expect((req.user as any).userId).toBe('user-1');
    expect((req.user as any).tenantId).toBe('tenant-1');
  });

  it('passes unexpected errors to next()', async () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    const { req, res, next } = createMockReqRes('Bearer token');
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('requirePermissions middleware', () => {
  it('returns 401 when no user is attached', () => {
    const { req, res, next } = createMockReqRes();
    const middleware = requirePermissions('transactions:read');
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user lacks required permissions', () => {
    const req = { user: { sub: 'u', tid: 't', role: 'agent', perms: ['contacts:read'], jti: 'j', iat: 0 } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = requirePermissions('transactions:write');
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      }),
    );
  });

  it('calls next() when user has all required permissions', () => {
    const req = {
      user: { sub: 'u', tid: 't', role: 'agent', perms: ['transactions:read', 'transactions:write'], jti: 'j', iat: 0 },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    const middleware = requirePermissions('transactions:read', 'transactions:write');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next() when no permissions are required', () => {
    const req = { user: { sub: 'u', tid: 't', role: 'agent', perms: [], jti: 'j', iat: 0 } } as any;
    const res = {} as any;
    const next = vi.fn();

    const middleware = requirePermissions();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
