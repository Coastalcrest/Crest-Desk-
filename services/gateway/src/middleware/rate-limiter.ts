import rateLimit from "express-rate-limit";
import type { Request } from "express";

// ------------------------------------------------------------------ //
//  Default rate limiter  - 100 requests / minute per user             //
// ------------------------------------------------------------------ //

/**
 * Standard rate limiter applied to all routes.
 *
 * Identifies callers by their authenticated user ID when available,
 * falling back to the originating IP address for unauthenticated
 * requests.  Adds standard `X-RateLimit-*` response headers.
 */
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: "draft-7", // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Prefer the authenticated userId so that limits follow the user
    // rather than a shared office IP.
    return req.user?.userId ?? req.ip ?? "unknown";
  },
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message:
        "Too many requests. Please wait before trying again.",
    },
  },
});

// ------------------------------------------------------------------ //
//  Auth endpoint limiter - 10 requests / minute per IP                //
// ------------------------------------------------------------------ //

/**
 * Stricter rate limiter scoped to authentication endpoints
 * (login, register, password reset, etc.) to slow down brute-force
 * and credential-stuffing attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Always key on IP for auth endpoints - the caller is by
    // definition not yet authenticated.
    return req.ip ?? "unknown";
  },
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message:
        "Too many authentication attempts. Please wait before trying again.",
    },
  },
});
