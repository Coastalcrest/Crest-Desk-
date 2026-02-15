import { randomBytes } from 'node:crypto';

/**
 * Generate a unique request ID for API tracing.
 * Format: req_<random-hex>
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('hex')}`;
}
