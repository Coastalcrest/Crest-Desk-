import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

// ------------------------------------------------------------------ //
//  Validation middleware factories                                     //
//                                                                     //
//  Usage:                                                             //
//    router.post('/', validateBody(createTransactionSchema), handler) //
//    router.get('/', validateQuery(listTransactionsQuery), handler)   //
//    router.get('/:id', validateParams(idParam), handler)             //
//                                                                     //
//  On validation failure, throws ZodError which is caught by the      //
//  globalErrorHandler and returned as a 400 VALIDATION_ERROR.         //
// ------------------------------------------------------------------ //

/**
 * Validate and replace `req.body` with parsed output.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

/**
 * Validate and replace `req.query` with parsed output.
 * Zod coercion handles string → number conversion for pagination etc.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as any).query = schema.parse(req.query);
    next();
  };
}

/**
 * Validate and replace `req.params` with parsed output.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as any).params = schema.parse(req.params);
    next();
  };
}
