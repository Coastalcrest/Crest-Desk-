import { db } from './db';
import { auditLog } from './schema';
import { logger } from './logger';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event. This is fire-and-forget; failures are logged but
 * do not propagate to the caller.
 */
export function logAudit(entry: AuditEntry): void {
  db.insert(auditLog)
    .values({
      tenantId: entry.tenantId,
      userId: entry.userId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      details: entry.details ?? {},
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    })
    .then(() => {
      logger.debug(
        { action: entry.action, resourceType: entry.resourceType },
        'Audit event logged',
      );
    })
    .catch((err) => {
      logger.error({ err, entry }, 'Failed to write audit log');
    });
}
