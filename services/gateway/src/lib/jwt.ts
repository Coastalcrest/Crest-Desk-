import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme-not-for-production';
const JWT_ISSUER = 'crestdesk';
const ACCESS_TOKEN_EXPIRY = '15m';

export interface JwtPayload {
  sub: string;      // userId
  tid: string;      // tenantId
  role: string;
  perms: string[];
  jti: string;
}

export function signAccessToken(payload: {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      tid: payload.tenantId,
      role: payload.role,
      perms: payload.permissions,
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: JWT_ISSUER,
    },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
  }) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
