import type { Response } from 'express';

// ------------------------------------------------------------------ //
//  Response envelope helpers                                          //
//                                                                     //
//  Every successful response from the gateway uses one of these       //
//  helpers to ensure a consistent JSON envelope:                      //
//                                                                     //
//    Single resource:  { data: T }                                    //
//    List/paginated:   { data: T[], pagination: {...} }               //
//    Error:            { error: { code, message, ... } }              //
// ------------------------------------------------------------------ //

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Send a single resource wrapped in `{ data: T }`.
 *
 * @example sendData(res, user)
 * @example sendData(res, transaction, 201)
 */
export function sendData<T>(
  res: Response,
  data: T,
  status = 200,
): void {
  res.status(status).json({ data });
}

/**
 * Send a paginated list wrapped in `{ data: T[], pagination }`.
 *
 * @example sendPaginated(res, transactions, { page: 1, pageSize: 25, total: 100 })
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; pageSize: number; total: number },
  status = 200,
): void {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  res.status(status).json({
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
    },
  });
}

/**
 * Send a JSON error envelope.
 *
 * @example sendError(res, 404, 'NOT_FOUND', 'Transaction not found')
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: Record<string, unknown> = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  res.status(status).json(body);
}
