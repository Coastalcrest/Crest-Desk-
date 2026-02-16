import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole, hasMinimumRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// GET /events — List security events (principal_broker+)
router.get('/events', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const eventType = req.query.eventType as string;
    const severity = req.query.severity as string;
    const userId = req.query.userId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await withTenantContext(tenantId, async (tx) => {
      const conditions: any[] = [eq(schema.securityEvents.tenantId, tenantId)];

      if (eventType) conditions.push(eq(schema.securityEvents.eventType, eventType));
      if (severity) conditions.push(eq(schema.securityEvents.severity, severity));
      if (userId) conditions.push(eq(schema.securityEvents.userId, userId));
      if (startDate) conditions.push(gte(schema.securityEvents.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(schema.securityEvents.createdAt, new Date(endDate)));

      const rows = await tx.select().from(schema.securityEvents)
        .where(and(...conditions))
        .orderBy(desc(schema.securityEvents.createdAt))
        .limit(limit).offset(offset);

      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.securityEvents).where(and(...conditions));

      return { rows, total };
    });

    return res.json({
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    console.error('List security events error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list security events' } });
  }
});

// GET /events/stats — Event counts by type/severity (principal_broker+)
router.get('/events/stats', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stats = await withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Total events last 24h
      const [{ total24h }] = await tx.select({ total24h: sql<number>`count(*)::int` })
        .from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          gte(schema.securityEvents.createdAt, last24h),
        ));

      // Critical events last 24h
      const [{ critical24h }] = await tx.select({ critical24h: sql<number>`count(*)::int` })
        .from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          eq(schema.securityEvents.severity, 'critical'),
          gte(schema.securityEvents.createdAt, last24h),
        ));

      // Failed logins last 24h
      const [{ failedLogins24h }] = await tx.select({ failedLogins24h: sql<number>`count(*)::int` })
        .from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          eq(schema.securityEvents.eventType, 'login_failure'),
          gte(schema.securityEvents.createdAt, last24h),
        ));

      // Unresolved events
      const [{ unresolved }] = await tx.select({ unresolved: sql<number>`count(*)::int` })
        .from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          eq(schema.securityEvents.severity, 'critical'),
          isNull(schema.securityEvents.resolvedAt),
        ));

      // Events by type last 7 days
      const byType = await tx.select({
        eventType: schema.securityEvents.eventType,
        count: sql<number>`count(*)::int`,
      }).from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          gte(schema.securityEvents.createdAt, last7d),
        ))
        .groupBy(schema.securityEvents.eventType);

      // Events by severity last 7 days
      const bySeverity = await tx.select({
        severity: schema.securityEvents.severity,
        count: sql<number>`count(*)::int`,
      }).from(schema.securityEvents)
        .where(and(
          eq(schema.securityEvents.tenantId, tenantId),
          gte(schema.securityEvents.createdAt, last7d),
        ))
        .groupBy(schema.securityEvents.severity);

      return { total24h, critical24h, failedLogins24h, unresolved, byType, bySeverity };
    });

    return res.json({ data: stats });
  } catch (err) {
    console.error('Security events stats error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get event stats' } });
  }
});

// GET /events/:id — Get single event detail (principal_broker+)
router.get('/events/:id', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const event = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.securityEvents)
        .where(and(eq(schema.securityEvents.id, id), eq(schema.securityEvents.tenantId, tenantId)));
      return row;
    });

    if (!event) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Security event not found' } });
    }

    return res.json({ data: event });
  } catch (err) {
    console.error('Get security event error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get security event' } });
  }
});

// PATCH /events/:id/resolve — Mark event resolved (principal_broker+)
router.patch('/events/:id/resolve', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const updated = await withTenantContext(tenantId, async (tx) => {
      // security_events has insert-only rule but we allow resolution field updates
      const [row] = await tx.update(schema.securityEvents)
        .set({ resolvedAt: new Date(), resolvedBy: userId, resolutionNotes: resolutionNotes || null })
        .where(and(eq(schema.securityEvents.id, id), eq(schema.securityEvents.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Security event not found' } });
    }

    logAudit({ tenantId, userId, action: 'security.event.resolved', resourceType: 'security_event', resourceId: id, details: { resolutionNotes }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    console.error('Resolve security event error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve security event' } });
  }
});

// GET /login-history — Login history (agents see own, brokers see team/brokerage)
router.get('/login-history', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;

    const result = await withTenantContext(tenantId, async (tx) => {
      const conditions: any[] = [eq(schema.loginHistory.tenantId, tenantId)];

      // Agents can only see their own login history
      if (!hasMinimumRole(role, 'managing_broker')) {
        conditions.push(eq(schema.loginHistory.userId, userId));
      }

      const rows = await tx.select().from(schema.loginHistory)
        .where(and(...conditions))
        .orderBy(desc(schema.loginHistory.createdAt))
        .limit(limit).offset(offset);

      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.loginHistory).where(and(...conditions));

      return { rows, total };
    });

    return res.json({
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    console.error('List login history error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list login history' } });
  }
});

// GET /login-history/:userId — Login history for specific user (managing_broker+)
router.get('/login-history/:userId', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { userId: targetUserId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;

    const result = await withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(schema.loginHistory.tenantId, tenantId),
        eq(schema.loginHistory.userId, targetUserId),
      ];

      const rows = await tx.select().from(schema.loginHistory)
        .where(and(...conditions))
        .orderBy(desc(schema.loginHistory.createdAt))
        .limit(limit).offset(offset);

      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.loginHistory).where(and(...conditions));

      return { rows, total };
    });

    return res.json({
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    console.error('Get user login history error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user login history' } });
  }
});

// GET /trusted-devices — List own trusted devices
router.get('/trusted-devices', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;

    const devices = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.trustedDevices)
        .where(and(
          eq(schema.trustedDevices.tenantId, tenantId),
          eq(schema.trustedDevices.userId, userId),
          isNull(schema.trustedDevices.revokedAt),
        ))
        .orderBy(desc(schema.trustedDevices.lastUsedAt));
    });

    return res.json({ data: devices, total: devices.length });
  } catch (err) {
    console.error('List trusted devices error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list trusted devices' } });
  }
});

// DELETE /trusted-devices/:id — Revoke own trusted device
router.delete('/trusted-devices/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const revoked = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.trustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(schema.trustedDevices.id, id),
          eq(schema.trustedDevices.tenantId, tenantId),
          eq(schema.trustedDevices.userId, userId),
        ))
        .returning();
      return row;
    });

    if (!revoked) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Trusted device not found' } });
    }

    logAudit({ tenantId, userId, action: 'security.device.revoked', resourceType: 'trusted_device', resourceId: id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: revoked });
  } catch (err) {
    console.error('Revoke trusted device error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke trusted device' } });
  }
});

// POST /trusted-devices/:id/revoke — Admin revoke user's device (managing_broker+)
router.post('/trusted-devices/:id/revoke', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const revoked = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.trustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(schema.trustedDevices.id, id),
          eq(schema.trustedDevices.tenantId, tenantId),
        ))
        .returning();
      return row;
    });

    if (!revoked) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Trusted device not found' } });
    }

    logAudit({ tenantId, userId, action: 'security.device.admin_revoked', resourceType: 'trusted_device', resourceId: id, details: { revokedUserId: revoked.userId }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: revoked });
  } catch (err) {
    console.error('Admin revoke trusted device error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to admin revoke trusted device' } });
  }
});

export default router;
