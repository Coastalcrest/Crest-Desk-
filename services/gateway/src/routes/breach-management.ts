import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// GET /rules — List all 50-state breach notification rules (principal_broker+)
router.get('/rules', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    // breach_notification_rules is global (no tenant context needed, no RLS)
    const rules = await db.select().from(schema.breachNotificationRules)
      .orderBy(schema.breachNotificationRules.stateCode);

    return res.json({ data: rules, total: rules.length });
  } catch (err) {
    console.error('List breach rules error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list breach notification rules' } });
  }
});

// GET /rules/:stateCode — Get single state rule (principal_broker+)
router.get('/rules/:stateCode', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { stateCode } = req.params;

    const [rule] = await db.select().from(schema.breachNotificationRules)
      .where(eq(schema.breachNotificationRules.stateCode, stateCode.toUpperCase()));

    if (!rule) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'State breach rule not found' } });
    }

    return res.json({ data: rule });
  } catch (err) {
    console.error('Get breach rule error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get breach rule' } });
  }
});

// GET /incidents — List breach incidents (principal_broker+)
router.get('/incidents', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const result = await withTenantContext(tenantId, async (tx) => {
      const conditions: any[] = [
        eq(schema.breachIncidents.tenantId, tenantId),
        isNull(schema.breachIncidents.deletedAt),
      ];

      if (status) conditions.push(eq(schema.breachIncidents.status, status));

      const rows = await tx.select().from(schema.breachIncidents)
        .where(and(...conditions))
        .orderBy(desc(schema.breachIncidents.createdAt))
        .limit(limit).offset(offset);

      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.breachIncidents).where(and(...conditions));

      return { rows, total };
    });

    return res.json({
      data: result.rows,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    console.error('List breach incidents error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list breach incidents' } });
  }
});

// POST /incidents — Create new incident (owner only)
router.post('/incidents', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { title, description, severity, affectedRecordsCount, affectedStates, dataTypesExposed } = req.body;

    if (!title) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } });
    }

    const incident = await withTenantContext(tenantId, async (tx) => {
      // Generate incident number: BR-YYYY-NNN
      const year = new Date().getFullYear();
      const [{ count: existingCount }] = await tx.select({ count: sql<number>`count(*)::int` })
        .from(schema.breachIncidents)
        .where(eq(schema.breachIncidents.tenantId, tenantId));

      const incidentNumber = `BR-${year}-${String(existingCount + 1).padStart(3, '0')}`;

      const [row] = await tx.insert(schema.breachIncidents).values({
        tenantId,
        incidentNumber,
        title,
        description: description || null,
        severity: severity || 'medium',
        status: 'detected',
        affectedRecordsCount: affectedRecordsCount || 0,
        affectedStates: affectedStates || [],
        dataTypesExposed: dataTypesExposed || [],
        reportedBy: userId,
      }).returning();

      return row;
    });

    logAudit({ tenantId, userId, action: 'breach.incident.created', resourceType: 'breach_incident', resourceId: incident.id, details: { incidentNumber: incident.incidentNumber, title, severity: incident.severity }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({ data: incident });
  } catch (err) {
    console.error('Create breach incident error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create breach incident' } });
  }
});

// GET /incidents/:id — Get incident with notifications (principal_broker+)
router.get('/incidents/:id', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [incident] = await tx.select().from(schema.breachIncidents)
        .where(and(
          eq(schema.breachIncidents.id, id),
          eq(schema.breachIncidents.tenantId, tenantId),
          isNull(schema.breachIncidents.deletedAt),
        ));

      if (!incident) return null;

      const notifications = await tx.select().from(schema.breachNotifications)
        .where(and(
          eq(schema.breachNotifications.incidentId, id),
          eq(schema.breachNotifications.tenantId, tenantId),
        ))
        .orderBy(schema.breachNotifications.stateCode);

      return { ...incident, notifications };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Breach incident not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    console.error('Get breach incident error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get breach incident' } });
  }
});

// PATCH /incidents/:id — Update incident status/details (owner only)
router.patch('/incidents/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const allowedFields = [
      'title', 'description', 'severity', 'status', 'containedAt', 'resolvedAt',
      'affectedRecordsCount', 'affectedStates', 'dataTypesExposed',
      'rootCause', 'remediationSteps', 'assignedTo',
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.breachIncidents)
        .set(updates)
        .where(and(
          eq(schema.breachIncidents.id, id),
          eq(schema.breachIncidents.tenantId, tenantId),
          isNull(schema.breachIncidents.deletedAt),
        ))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Breach incident not found' } });
    }

    logAudit({ tenantId, userId, action: 'breach.incident.updated', resourceType: 'breach_incident', resourceId: id, details: { updated: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    console.error('Update breach incident error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update breach incident' } });
  }
});

// DELETE /incidents/:id — Soft-delete incident (owner only)
router.delete('/incidents/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.breachIncidents)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(schema.breachIncidents.id, id),
          eq(schema.breachIncidents.tenantId, tenantId),
          isNull(schema.breachIncidents.deletedAt),
        ))
        .returning();
      return row;
    });

    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Breach incident not found' } });
    }

    logAudit({ tenantId, userId, action: 'breach.incident.deleted', resourceType: 'breach_incident', resourceId: id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('Delete breach incident error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete breach incident' } });
  }
});

// POST /incidents/:id/notifications — Generate notification obligations for affected states (owner only)
router.post('/incidents/:id/notifications', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Get the incident
      const [incident] = await tx.select().from(schema.breachIncidents)
        .where(and(
          eq(schema.breachIncidents.id, id),
          eq(schema.breachIncidents.tenantId, tenantId),
          isNull(schema.breachIncidents.deletedAt),
        ));

      if (!incident) return null;

      const affectedStates = incident.affectedStates || [];
      if (affectedStates.length === 0) {
        return { created: 0, message: 'No affected states specified on the incident' };
      }

      // Get rules for affected states (global table, no tenant context)
      const rules = await db.select().from(schema.breachNotificationRules)
        .where(sql`${schema.breachNotificationRules.stateCode} = ANY(${affectedStates})`);

      // Generate notifications for each state/type combination
      const notifications: any[] = [];
      for (const rule of rules) {
        const deadlineDate = rule.notificationDeadlineDays
          ? new Date(incident.discoveredAt.getTime() + rule.notificationDeadlineDays * 24 * 60 * 60 * 1000)
          : null;

        // Attorney General notification
        if (rule.attorneyGeneralRequired) {
          notifications.push({
            tenantId,
            incidentId: id,
            stateCode: rule.stateCode,
            notificationType: 'attorney_general',
            deadlineDate: deadlineDate?.toISOString().split('T')[0] || null,
            status: 'pending',
          });
        }

        // Consumer reporting agency notification
        if (rule.consumerReportingRequired) {
          notifications.push({
            tenantId,
            incidentId: id,
            stateCode: rule.stateCode,
            notificationType: 'credit_bureau',
            deadlineDate: deadlineDate?.toISOString().split('T')[0] || null,
            status: 'pending',
          });
        }

        // Consumer notification (always required)
        notifications.push({
          tenantId,
          incidentId: id,
          stateCode: rule.stateCode,
          notificationType: 'consumer',
          deadlineDate: deadlineDate?.toISOString().split('T')[0] || null,
          status: 'pending',
        });
      }

      if (notifications.length > 0) {
        await tx.insert(schema.breachNotifications).values(notifications);
      }

      return { created: notifications.length };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Breach incident not found' } });
    }

    logAudit({ tenantId, userId, action: 'breach.notifications.generated', resourceType: 'breach_incident', resourceId: id, details: result, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: result });
  } catch (err) {
    console.error('Generate breach notifications error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate breach notifications' } });
  }
});

// PATCH /incidents/:id/notifications/:nid — Update notification status (owner only)
router.patch('/incidents/:id/notifications/:nid', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id, nid } = req.params;
    const { status, referenceNumber, notes } = req.body;

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (referenceNumber !== undefined) updates.referenceNumber = referenceNumber;
    if (notes !== undefined) updates.notes = notes;
    if (status === 'sent') {
      updates.sentAt = new Date();
      updates.sentBy = userId;
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.breachNotifications)
        .set(updates)
        .where(and(
          eq(schema.breachNotifications.id, nid),
          eq(schema.breachNotifications.incidentId, id),
          eq(schema.breachNotifications.tenantId, tenantId),
        ))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Breach notification not found' } });
    }

    logAudit({ tenantId, userId, action: 'breach.notification.updated', resourceType: 'breach_notification', resourceId: nid, details: { incidentId: id, ...updates }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    console.error('Update breach notification error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update breach notification' } });
  }
});

// GET /incidents/stats — Incident summary stats (principal_broker+)
router.get('/incidents/stats', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stats = await withTenantContext(tenantId, async (tx) => {
      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.breachIncidents)
        .where(and(eq(schema.breachIncidents.tenantId, tenantId), isNull(schema.breachIncidents.deletedAt)));

      const [{ active }] = await tx.select({ active: sql<number>`count(*)::int` })
        .from(schema.breachIncidents)
        .where(and(
          eq(schema.breachIncidents.tenantId, tenantId),
          isNull(schema.breachIncidents.deletedAt),
          sql`${schema.breachIncidents.status} IN ('detected', 'investigating', 'contained')`,
        ));

      const [{ pendingNotifications }] = await tx.select({ pendingNotifications: sql<number>`count(*)::int` })
        .from(schema.breachNotifications)
        .where(and(
          eq(schema.breachNotifications.tenantId, tenantId),
          eq(schema.breachNotifications.status, 'pending'),
        ));

      const [{ overdueNotifications }] = await tx.select({ overdueNotifications: sql<number>`count(*)::int` })
        .from(schema.breachNotifications)
        .where(and(
          eq(schema.breachNotifications.tenantId, tenantId),
          eq(schema.breachNotifications.status, 'overdue'),
        ));

      return { total, active, pendingNotifications, overdueNotifications };
    });

    return res.json({ data: stats });
  } catch (err) {
    console.error('Breach incidents stats error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get breach incident stats' } });
  }
});

export default router;
