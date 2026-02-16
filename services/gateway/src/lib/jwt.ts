import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { logger } from './logger';

// ------------------------------------------------------------------ //
//  JWT Configuration                                                   //
//                                                                     //
//  SECURITY: The JWT_SECRET must be set via environment variable.      //
//  In production, it must be at least 32 characters long.             //
//  The gateway will refuse to start without it.                       //
// ------------------------------------------------------------------ //

const MIN_SECRET_LENGTH = 32;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const msg = 'FATAL: JWT_SECRET environment variable is not set. The gateway cannot start without it.';
    logger.fatal(msg);
    throw new Error(msg);
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    const msg = `FATAL: JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long (got ${secret.length}). Use a cryptographically random string.`;
    logger.fatal(msg);
    throw new Error(msg);
  }

  return secret;
}

// Eagerly validate at import time so the process crashes on startup
// rather than on the first request.
const JWT_SECRET = getJwtSecret();

const JWT_ISSUER = 'crestdesk';
const JWT_AUDIENCE = 'crestdesk-api';
const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes in seconds

export interface JwtPayload {
  sub: string;      // userId
  tid: string;      // tenantId
  role: string;
  perms: string[];
  jti: string;
  iat: number;      // issued-at (epoch seconds)
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
      audience: JWT_AUDIENCE,
    },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}

/**
 * Returns the maximum remaining lifetime of an access token in seconds.
 * Used to set Redis TTL when blacklisting tokens.
 */
export function getAccessTokenMaxAge(): number {
  return ACCESS_TOKEN_EXPIRY_SECONDS;
}

// ------------------------------------------------------------------ //
//  MFA token helpers                                                   //
//  Short-lived tokens used during the MFA verification flow.           //
// ------------------------------------------------------------------ //

export interface MfaTokenPayload {
  sub: string;
  purpose: 'mfa';
}

export function signMfaToken(userId: string, expiresIn = '5m'): string {
  return jwt.sign(
    { sub: userId, purpose: 'mfa' },
    JWT_SECRET,
    { expiresIn },
  );
}

export function verifyMfaToken(token: string): MfaTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as MfaTokenPayload;
  if (decoded.purpose !== 'mfa') {
    throw new Error('Invalid MFA token purpose');
  }
  return decoded;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
