/**
 * Mock authentication utilities for unit tests.
 *
 * Provides helpers to generate valid JWT tokens and auth headers
 * for testing authenticated endpoints.
 */
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

const TEST_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-vitest-must-be-at-least-32-chars-long';

export interface MockUserOptions {
  userId?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
  jti?: string;
}

export const DEFAULT_USER = {
  userId: '00000000-0000-0000-0000-000000000010',
  tenantId: '00000000-0000-0000-0000-000000000001',
  role: 'managing_broker',
  permissions: [
    'transactions:read', 'transactions:write',
    'contacts:read', 'contacts:write',
    'documents:read', 'documents:write',
    'billing:read', 'billing:write',
    'users:read', 'users:write',
    'compliance:read', 'compliance:write',
    'reports:read',
  ],
};

export const AGENT_USER = {
  userId: '00000000-0000-0000-0000-000000000011',
  tenantId: '00000000-0000-0000-0000-000000000001',
  role: 'agent',
  permissions: [
    'transactions:read', 'transactions:write',
    'contacts:read', 'contacts:write',
    'documents:read', 'documents:write',
  ],
};

/**
 * Generate a valid JWT access token for testing.
 */
export function generateTestToken(options: MockUserOptions = {}): string {
  const {
    userId = DEFAULT_USER.userId,
    tenantId = DEFAULT_USER.tenantId,
    role = DEFAULT_USER.role,
    permissions = DEFAULT_USER.permissions,
    jti = uuid(),
  } = options;

  return jwt.sign(
    {
      sub: userId,
      tid: tenantId,
      role,
      perms: permissions,
      jti,
    },
    TEST_SECRET,
    {
      expiresIn: '15m',
      issuer: 'crestdesk',
      audience: 'crestdesk-api',
    },
  );
}

/**
 * Generate an Authorization header value.
 */
export function authHeader(options?: MockUserOptions): string {
  return `Bearer ${generateTestToken(options)}`;
}

/**
 * Generate an expired token for testing 401 responses.
 */
export function generateExpiredToken(options: MockUserOptions = {}): string {
  const {
    userId = DEFAULT_USER.userId,
    tenantId = DEFAULT_USER.tenantId,
    role = DEFAULT_USER.role,
    permissions = DEFAULT_USER.permissions,
    jti = uuid(),
  } = options;

  return jwt.sign(
    {
      sub: userId,
      tid: tenantId,
      role,
      perms: permissions,
      jti,
    },
    TEST_SECRET,
    {
      expiresIn: '-1s', // Already expired
      issuer: 'crestdesk',
      audience: 'crestdesk-api',
    },
  );
}
