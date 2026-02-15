import type { ApiError, ApiResponse } from '@crestdesk/types';

/**
 * Format a successful API response.
 */
export function formatApiResponse<T>(data: T): ApiResponse<T> {
  return { data };
}

/**
 * Format an error API response.
 */
export function formatApiError(
  code: string,
  message: string,
  requestId: string,
  details?: Array<{ field: string; message: string }>,
): ApiError {
  return {
    error: {
      code,
      message,
      details,
      requestId,
    },
  };
}
