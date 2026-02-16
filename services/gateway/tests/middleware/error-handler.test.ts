/**
 * Unit tests for global error handler.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

// Mock logger
vi.mock('../../src/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { globalErrorHandler, AppError } from '../../src/middleware/error-handler';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  } as unknown as Response;
  return res;
}

describe('globalErrorHandler', () => {
  const req = {} as Request;
  const next = vi.fn() as NextFunction;

  it('handles ZodError as 400 VALIDATION_ERROR', () => {
    const schema = z.object({ name: z.string(), email: z.string().email() });
    let zodError: ZodError;
    try {
      schema.parse({ name: 123, email: 'bad' });
    } catch (e) {
      zodError = e as ZodError;
    }

    const res = createMockRes();
    globalErrorHandler(zodError!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      }),
    );
  });

  it('handles AppError with custom status code', () => {
    const err = new AppError(409, 'CONFLICT', 'Resource already exists');
    const res = createMockRes();
    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'Resource already exists',
        }),
      }),
    );
  });

  it('handles generic Error as 500 INTERNAL_SERVER_ERROR', () => {
    const err = new Error('Something broke');
    const res = createMockRes();
    globalErrorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
        }),
      }),
    );
  });

  it('does not send response if headers already sent', () => {
    const err = new Error('error after headers');
    const res = createMockRes();
    (res as any).headersSent = true;
    globalErrorHandler(err, req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
