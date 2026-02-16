import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, gte, isNull } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// GET /policies — Get tenant security policy (principal_broker+)
router.get('/policies', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const policy = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.securityPolicies)
        .where(eq(schema.securityPolicies.tenantId, tenantId));
      return row;
    });

    // Return default values if no policy exists yet
    if (!policy) {
      return res.json({
        data: {
          tenantId,
          minPasswordLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxPasswordAgeDays: 90,
          passwordHistoryCount: 5,
          sessionTimeoutMinutes: 480,
          maxConcurrentSessions: 5,
          mfaRequiredRoles: ['owner', 'principal_broker'],
          ipAllowlistEnabled: false,
          lockoutThreshold: 5,
          lockoutDurationMinutes: 30,
        },
      });
    }

    return res.json({ data: policy });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get security policies error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get security policies' } });
  }
});

// PATCH /policies — Update security policy (owner only)
router.patch('/policies', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const updates = req.body;

    // Whitelist allowed fields
    const allowedFields = [
      'minPasswordLength', 'requireUppercase', 'requireLowercase', 'requireNumbers',
      'requireSpecialChars', 'maxPasswordAgeDays', 'passwordHistoryCount',
      'sessionTimeoutMinutes', 'maxConcurrentSessions', 'mfaRequiredRoles',
      'ipAllowlistEnabled', 'lockoutThreshold', 'lockoutDurationMinutes',
    ];

    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Upsert: create if not exists, update if exists
      const [existing] = await tx.select({ id: schema.securityPolicies.id })
        .from(schema.securityPolicies)
        .where(eq(schema.securityPolicies.tenantId, tenantId));

      if (existing) {
        const [row] = await tx.update(schema.securityPolicies)
          .set(sanitized)
          .where(eq(schema.securityPolicies.tenantId, tenantId))
          .returning();
        return row;
      } else {
        const [row] = await tx.insert(schema.securityPolicies)
          .values({ tenantId, ...sanitized })
          .returning();
        return row;
      }
    });

    logAudit({ tenantId, userId, action: 'security.policy.updated', resourceType: 'security_policy', details: { updated: Object.keys(sanitized) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update security policies error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update security policies' } });
  }
});

// GET /ip-allowlist — List IP allowlist entries (principal_broker+)
router.get('/ip-allowlist', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const entries = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.ipAllowlists)
        .where(eq(schema.ipAllowlists.tenantId, tenantId))
        .orderBy(desc(schema.ipAllowlists.createdAt));
    });

    return res.json({ data: entries, total: entries.length });
  } catch (err) {
    logger.error({ err, tenantId }, 'List IP allowlist error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list IP allowlist' } });
  }
});

// POST /ip-allowlist — Add CIDR range (owner only)
router.post('/ip-allowlist', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { cidrRange, label } = req.body;

    if (!cidrRange) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'cidrRange is required' } });
    }

    const entry = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.ipAllowlists)
        .values({ tenantId, cidrRange, label: label || null, createdBy: userId })
        .returning();
      return row;
    });

    logAudit({ tenantId, userId, action: 'security.ip_allowlist.added', resourceType: 'ip_allowlist', resourceId: entry.id, details: { cidrRange, label }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({ data: entry });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'This CIDR range already exists' } });
    }
    logger.error({ err, tenantId, userId }, 'Add IP allowlist error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add IP allowlist entry' } });
  }
});

// PATCH /ip-allowlist/:id — Enable/disable entry (owner only)
router.patch('/ip-allowlist/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { enabled, label } = req.body;

    const updates: Record<string, any> = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (label !== undefined) updates.label = label;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.ipAllowlists)
        .set(updates)
        .where(and(eq(schema.ipAllowlists.id, id), eq(schema.ipAllowlists.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'IP allowlist entry not found' } });
    }

    logAudit({ tenantId, userId, action: 'security.ip_allowlist.updated', resourceType: 'ip_allowlist', resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update IP allowlist error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update IP allowlist entry' } });
  }
});

// DELETE /ip-allowlist/:id — Remove IP entry (owner only)
router.delete('/ip-allowlist/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.delete(schema.ipAllowlists)
        .where(and(eq(schema.ipAllowlists.id, id), eq(schema.ipAllowlists.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'IP allowlist entry not found' } });
    }

    logAudit({ tenantId, userId, action: 'security.ip_allowlist.removed', resourceType: 'ip_allowlist', resourceId: id, details: { cidrRange: deleted.cidrRange }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete IP allowlist error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete IP allowlist entry' } });
  }
});

// GET /dashboard — Security dashboard stats (principal_broker+)
router.get('/dashboard', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stats = await withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Security events last 24h
      const [{ events24h }] = await tx.select({ events24h: sql<number>`count(*)::int` })
        .from(schema.securityEvents)
        .where(and(eq(schema.securityEvents.tenantId, tenantId), gte(schema.securityEvents.createdAt, last24h)));

      // Failed logins last 24h
      const [{ failedLogins }] = await tx.select({ failedLogins: sql<number>`count(*)::int` })
        .from(schema.loginHistory)
        .where(and(
          eq(schema.loginHistory.tenantId, tenantId),
          eq(schema.loginHistory.success, false),
          gte(schema.loginHistory.createdAt, last24h),
        ));

      // Active sessions
      const [{ activeSessions }] = await tx.select({ activeSessions: sql<number>`count(*)::int` })
        .from(schema.sessions)
        .where(and(
          eq(schema.sessions.tenantId, tenantId),
          eq(schema.sessions.revoked, false),
        ));

      // Trusted devices
      const [{ trustedDeviceCount }] = await tx.select({ trustedDeviceCount: sql<number>`count(*)::int` })
        .from(schema.trustedDevices)
        .where(and(
          eq(schema.trustedDevices.tenantId, tenantId),
          isNull(schema.trustedDevices.revokedAt),
        ));

      // Policy status
      const [policy] = await tx.select().from(schema.securityPolicies)
        .where(eq(schema.securityPolicies.tenantId, tenantId));

      // Recent critical events
      const recentCritical = await tx.select().from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          eq(schema.securityEvents.severity, 'critical'),
          gte(schema.securityEvents.createdAt, last7d),
        ))
        .orderBy(desc(schema.securityEvents.createdAt))
        .limit(5);

      return {
        events24h,
        failedLogins,
        activeSessions,
        trustedDeviceCount,
        policyConfigured: !!policy,
        mfaEnforced: policy?.mfaRequiredRoles?.length > 0,
        ipAllowlistEnabled: policy?.ipAllowlistEnabled ?? false,
        recentCritical,
      };
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Security dashboard error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get security dashboard' } });
  }
});

export default router;
