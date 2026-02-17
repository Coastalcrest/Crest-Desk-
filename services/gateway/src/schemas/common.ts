import { z } from 'zod';

// ------------------------------------------------------------------ //
//  Reusable validators                                                //
// ------------------------------------------------------------------ //

/** UUID v4 format */
export const uuidSchema = z.string().uuid('Must be a valid UUID');

/**
 * Pagination query params.
 * Accepts both `pageSize` (preferred) and `limit` as aliases.
 */
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Common search param */
export const searchQuery = z.object({
  search: z.string().optional(),
});

/** US state code (2-char uppercase) */
export const stateCode = z.string().length(2).toUpperCase();

/** Date string (YYYY-MM-DD) */
export const dateString = z.string().date('Must be YYYY-MM-DD format');

/** ISO datetime string */
export const dateTimeString = z.string().datetime({ offset: true }).optional();

/** Non-empty trimmed string */
export const nonEmpty = z.string().trim().min(1, 'Must not be empty');

/** Email address */
export const emailSchema = z.string().email('Invalid email address').max(320);

/** Optional positive number (for prices, scores, etc.) */
export const optionalPositiveNumber = z.number().positive().optional();

/** Route params with :id */
export const idParam = z.object({
  id: uuidSchema,
});

/** Sort direction */
export const sortDirection = z.enum(['asc', 'desc']).default('desc');
