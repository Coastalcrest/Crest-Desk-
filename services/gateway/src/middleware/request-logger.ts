import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';

// ------------------------------------------------------------------ //
//  Request Logger Middleware                                           //
//                                                                     //
//  Logs every HTTP request with structured JSON fields:               //
//    method, path, status, responseTime (ms), userId, tenantId,       //
//    requestId, contentLength, userAgent, ip                          //
//                                                                     //
//  Sensitive fields (passwords, tokens, secrets) are automatically    //
//  redacted from logged request bodies.                               //
// ------------------------------------------------------------------ //

// Fields that should never appear in logs
const REDACTED_FIELDS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'mfaToken',
  'mfaSecret',
  'secret',
  'apiKey',
  'apiSecret',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
]);

/**
 * Recursively redact sensitive fields from an object.
 * Returns a shallow-ish copy — nested objects are also copied so we
 * never mutate the original request body.
 */
function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key.toLowerCase()) || REDACTED_FIELDS.has(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Assign a unique request ID (honour client-provided x-request-id if present).
 * Attach it to both the request object and response header.
 */
function ensureRequestId(req: Request, res: Response): string {
  const requestId =
    (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  return requestId;
}

/**
 * Express middleware that logs every request/response pair.
 *
 * Mount this **before** routes but **after** body-parser so that
 * `req.body` is available for redacted logging.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();
  const requestId = ensureRequestId(req, res);

  // Log the incoming request at debug level
  const logCtx: Record<string, unknown> = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  // Only log body for mutation requests and only in debug mode
  if (
    ['POST', 'PUT', 'PATCH'].includes(req.method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    logCtx.body = redactSensitive(req.body);
  }

  logger.debug(logCtx, 'Incoming request');

  // Hook into the response finish event to log the outcome
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const responseTimeMs = Number(durationNs / 1_000_000n);

    const responseCtx: Record<string, unknown> = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      responseTimeMs,
      contentLength: res.getHeader('content-length'),
    };

    // Attach user info if authenticated
    if ((req as any).user) {
      responseCtx.userId = (req as any).user.userId ?? (req as any).user.sub;
      responseCtx.tenantId =
        (req as any).user.tenantId ?? (req as any).user.tid;
    }

    // Choose log level based on status code
    if (res.statusCode >= 500) {
      logger.error(responseCtx, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(responseCtx, 'Request completed with client error');
    } else {
      logger.info(responseCtx, 'Request completed');
    }
  });

  next();
}
