import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}

/**
 * Application error that carries an HTTP status code so the error
 * handler can set the correct response status.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ------------------------------------------------------------------ //
//  Middleware                                                          //
// ------------------------------------------------------------------ //

/**
 * Global error handler.
 *
 * Express identifies error-handling middleware by its four-parameter
 * signature.  This function catches every error that bubbles up from
 * route handlers or earlier middleware and returns a normalised JSON
 * error envelope.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? uuidv4();

  // ---- Zod validation errors ----------------------------------- //
  if (err instanceof ZodError) {
    const body: ApiError = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
        request_id: requestId,
      },
    };

    logger.warn({ requestId, validationErrors: err.errors }, "Validation error");
    res.status(400).json(body);
    return;
  }

  // ---- Known application errors -------------------------------- //
  if (err instanceof AppError) {
    const body: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        request_id: requestId,
      },
    };

    logger.warn(
      { requestId, code: err.code, statusCode: err.statusCode },
      err.message,
    );
    res.status(err.statusCode).json(body);
    return;
  }

  // ---- Unexpected / unhandled errors --------------------------- //
  logger.error(
    { requestId, err, stack: err.stack },
    "Unhandled error",
  );

  const body: ApiError = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      request_id: requestId,
    },
  };

  res.status(500).json(body);
}
