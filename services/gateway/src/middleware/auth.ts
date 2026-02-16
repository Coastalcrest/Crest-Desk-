import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt';
import { isTokenBlacklisted, isUserTokenRevoked } from '../lib/token-blacklist';
import { logger } from '../lib/logger';

export interface TokenPayload {
  sub: string;       // userId
  tid: string;       // tenantId
  role: string;
  perms: string[];
  jti: string;
  iat: number;       // issued-at (epoch seconds)
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
 * 2. Verifies JWT signature, expiry, issuer, and audience
 * 3. Checks token blacklist (single-token revocation)
 * 4. Checks user-level revocation (blanket invalidation)
 * 5. Attaches decoded payload to req.user
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

    // ---- Token blacklist checks ---------------------------------- //

    // Check if this specific token was revoked (e.g. on logout)
    if (decoded.jti) {
      const blacklisted = await isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
        logger.warn(
          { jti: decoded.jti, userId: decoded.sub },
          'Rejected blacklisted token',
        );
        res.status(401).json({
          error: {
            code: 'TOKEN_REVOKED',
            message: 'This token has been revoked',
          },
        });
        return;
      }
    }

    // Check if ALL tokens for this user were revoked (e.g. password change)
    if (decoded.sub && decoded.iat) {
      const userRevoked = await isUserTokenRevoked(decoded.sub, decoded.iat);
      if (userRevoked) {
        logger.warn(
          { userId: decoded.sub, iat: decoded.iat },
          'Rejected token issued before user-level revocation',
        );
        res.status(401).json({
          error: {
            code: 'TOKEN_REVOKED',
            message: 'All sessions have been invalidated. Please log in again.',
          },
        });
        return;
      }
    }

    // ---- Attach user to request ---------------------------------- //

    req.user = {
      sub: decoded.sub,
      tid: decoded.tid,
      role: decoded.role,
      perms: decoded.perms,
      jti: decoded.jti,
      iat: decoded.iat,
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
