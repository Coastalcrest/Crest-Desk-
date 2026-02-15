import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * Augment the Express Request type so `req.user` is available downstream.
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-not-for-production";

// ------------------------------------------------------------------ //
//  Middleware                                                          //
// ------------------------------------------------------------------ //

/**
 * JWT verification middleware.
 *
 * 1. Reads the Bearer token from the `Authorization` header.
 * 2. Verifies the JWT signature and expiry.
 * 3. Attaches the decoded payload to `req.user`.
 * 4. Sets the Postgres RLS context via `SET LOCAL app.current_tenant_id`
 *    so that every subsequent query in the same transaction is scoped to
 *    the caller's tenant.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or malformed Authorization header",
        },
      });
      return;
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // TODO: Replace stub with proper jwt.verify once signing keys are wired up
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    // TODO: Acquire a pooled PG client and execute:
    //   await client.query("SET LOCAL app.current_tenant_id = $1", [decoded.tenantId]);
    // This ensures row-level security policies scope every query to the
    // authenticated tenant for the lifetime of this request.

    logger.debug(
      { userId: decoded.userId, tenantId: decoded.tenantId },
      "Authenticated request",
    );

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "The provided token is invalid or expired",
        },
      });
      return;
    }

    next(err);
  }
}

/**
 * Authorisation guard factory.
 *
 * Returns middleware that checks whether `req.user` has **all** of the
 * listed permissions before allowing the request through.
 */
export function requirePermissions(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const missing = required.filter(
      (p) => !req.user!.permissions.includes(p),
    );

    if (missing.length > 0) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Missing required permissions: ${missing.join(", ")}`,
        },
      });
      return;
    }

    next();
  };
}
