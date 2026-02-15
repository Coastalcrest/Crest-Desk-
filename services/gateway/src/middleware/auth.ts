import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt';
import { db } from '../lib/db';
import { sessions } from '../lib/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger';

export interface TokenPayload {
  sub: string;       // userId
  tid: string;       // tenantId
  role: string;
  perms: string[];
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * JWT verification middleware.
 * 1. Reads Bearer token
 * 2. Verifies JWT signature and expiry
 * 3. Attaches decoded payload to req.user
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or malformed Authorization header',
        },
      });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);

    req.user = {
      sub: decoded.sub,
      tid: decoded.tid,
      role: decoded.role,
      perms: decoded.perms,
      jti: decoded.jti,
    };

    // Also set legacy fields for backwards compat with any code using userId/tenantId
    (req.user as any).userId = decoded.sub;
    (req.user as any).tenantId = decoded.tid;
    (req.user as any).permissions = decoded.perms;

    logger.debug(
      { userId: decoded.sub, tenantId: decoded.tid },
      'Authenticated request',
    );

    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'The provided token is invalid or expired',
        },
      });
      return;
    }
    next(err);
  }
}

/**
 * Permission-based authorization guard.
 * Checks whether req.user has ALL of the listed permissions.
 */
export function requirePermissions(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const missing = required.filter((p) => !req.user!.perms.includes(p));

    if (missing.length > 0) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permissions: ${missing.join(', ')}`,
          details: {
            required_permissions: required,
            your_role: req.user.role,
          },
        },
      });
      return;
    }

    next();
  };
}
