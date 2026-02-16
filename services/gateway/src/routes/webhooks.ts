import { Router, Request, Response } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const WEBHOOK_EVENT_TYPES = [
  { type: 'transaction.created', description: 'A new transaction is created' },
  { type: 'transaction.updated', description: 'A transaction is updated' },
  { type: 'transaction.status_changed', description: 'A transaction status changes' },
  { type: 'document.uploaded', description: 'A document is uploaded' },
  { type: 'document.signed', description: 'A document is signed' },
  { type: 'document.completed', description: 'A document signing is completed' },
  { type: 'contact.created', description: 'A new contact is created' },
  { type: 'contact.updated', description: 'A contact is updated' },
  { type: 'task.completed', description: 'A task is completed' },
  { type: 'task.overdue', description: 'A task becomes overdue' },
  { type: 'commission.calculated', description: 'A commission is calculated' },
  { type: 'commission.paid', description: 'A commission is paid' },
  { type: 'user.invited', description: 'A user is invited' },
  { type: 'user.deactivated', description: 'A user is deactivated' },
];

// ------------------------------------------------------------------ //
//  Routes                                                             //
// ------------------------------------------------------------------ //

// GET /events — Return available webhook event types
router.get('/events', requireRole('owner'), async (_req: Request, res: Response) => {
  return res.json({ data: WEBHOOK_EVENT_TYPES });
});

// GET /endpoints — List webhook endpoints
router.get('/endpoints', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const endpoints = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.webhookEndpoints.id,
        url: schema.webhookEndpoints.url,
        description: schema.webhookEndpoints.description,
        events: schema.webhookEndpoints.events,
        enabled: schema.webhookEndpoints.enabled,
        failureCount: schema.webhookEndpoints.failureCount,
        lastTriggeredAt: schema.webhookEndpoints.lastTriggeredAt,
        lastSuccessAt: schema.webhookEndpoints.lastSuccessAt,
        lastFailureAt: schema.webhookEndpoints.lastFailureAt,
        createdAt: schema.webhookEndpoints.createdAt,
      }).from(schema.webhookEndpoints)
        .where(eq(schema.webhookEndpoints.tenantId, tenantId))
        .orderBy(desc(schema.webhookEndpoints.createdAt));
    });

    return res.json({ data: endpoints, total: endpoints.length });
  } catch (err) {
    logger.error({ err, tenantId }, 'List webhook endpoints error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhook endpoints' } });
  }
});

// POST /endpoints — Create webhook endpoint
router.post('/endpoints', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { url, description, events, enabled } = req.body;

    if (!url) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'url is required' } });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one event type is required' } });
    }

    // Auto-generate HMAC signing secret
    const secret = randomBytes(32).toString('hex');

    const endpoint = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.webhookEndpoints)
        .values({
          tenantId,
          url,
          description: description || null,
          secret,
          events,
          enabled: enabled !== undefined ? enabled : true,
          createdBy: userId,
        })
        .returning();
      return row;
    });

    logAudit({ tenantId, userId, action: 'developer.webhook.created', resourceType: 'webhook_endpoint', resourceId: endpoint.id, details: { url, events }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({
      data: {
        id: endpoint.id,
        url: endpoint.url,
        description: endpoint.description,
        secret: endpoint.secret, // Only returned on creation
        events: endpoint.events,
        enabled: endpoint.enabled,
        createdAt: endpoint.createdAt,
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A webhook endpoint with this URL already exists' } });
    }
    logger.error({ err, tenantId, userId }, 'Create webhook endpoint error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook endpoint' } });
  }
});

// GET /endpoints/:id — Get endpoint detail with recent deliveries
router.get('/endpoints/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [endpoint] = await tx.select().from(schema.webhookEndpoints)
        .where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.tenantId, tenantId)));

      if (!endpoint) return null;

      // Get last 10 deliveries
      const recentDeliveries = await tx.select().from(schema.webhookDeliveries)
        .where(and(eq(schema.webhookDeliveries.endpointId, id), eq(schema.webhookDeliveries.tenantId, tenantId)))
        .orderBy(desc(schema.webhookDeliveries.createdAt))
        .limit(10);

      return {
        ...endpoint,
        // Never expose secret in GET detail
        secret: undefined,
        recentDeliveries,
      };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get webhook endpoint error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get webhook endpoint' } });
  }
});

// PATCH /endpoints/:id — Update endpoint
router.patch('/endpoints/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { url, events, enabled, description } = req.body;

    const updates: Record<string, any> = {};
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (enabled !== undefined) updates.enabled = enabled;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.webhookEndpoints)
        .set(updates)
        .where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' } });
    }

    logAudit({ tenantId, userId, action: 'developer.webhook.updated', resourceType: 'webhook_endpoint', resourceId: id, details: { updated: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({
      data: {
        id: updated.id,
        url: updated.url,
        description: updated.description,
        events: updated.events,
        enabled: updated.enabled,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update webhook endpoint error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update webhook endpoint' } });
  }
});

// DELETE /endpoints/:id — Delete endpoint (hard delete)
router.delete('/endpoints/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.delete(schema.webhookEndpoints)
        .where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' } });
    }

    logAudit({ tenantId, userId, action: 'developer.webhook.deleted', resourceType: 'webhook_endpoint', resourceId: id, details: { url: deleted.url }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete webhook endpoint error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook endpoint' } });
  }
});

// POST /endpoints/:id/test — Create a test delivery record
router.post('/endpoints/:id/test', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    // Verify endpoint exists and belongs to tenant
    const endpoint = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.webhookEndpoints)
        .where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.tenantId, tenantId)));
      return row;
    });

    if (!endpoint) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' } });
    }

    // Create a test delivery record
    const delivery = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.webhookDeliveries)
        .values({
          tenantId,
          endpointId: id,
          eventType: 'test.ping',
          payload: {
            type: 'test.ping',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook delivery from CrestDesk' },
          },
          status: 'pending',
          attempt: 1,
        })
        .returning();
      return row;
    });

    logAudit({ tenantId, userId, action: 'developer.webhook.test_sent', resourceType: 'webhook_endpoint', resourceId: id, details: { deliveryId: delivery.id }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({ data: delivery });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Test webhook error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create test delivery' } });
  }
});

// GET /endpoints/:id/deliveries — Paginated delivery history
router.get('/endpoints/:id/deliveries', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify endpoint belongs to tenant
      const [endpoint] = await tx.select({ id: schema.webhookEndpoints.id }).from(schema.webhookEndpoints)
        .where(and(eq(schema.webhookEndpoints.id, id), eq(schema.webhookEndpoints.tenantId, tenantId)));

      if (!endpoint) return null;

      const deliveries = await tx.select().from(schema.webhookDeliveries)
        .where(and(eq(schema.webhookDeliveries.endpointId, id), eq(schema.webhookDeliveries.tenantId, tenantId)))
        .orderBy(desc(schema.webhookDeliveries.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.webhookDeliveries)
        .where(and(eq(schema.webhookDeliveries.endpointId, id), eq(schema.webhookDeliveries.tenantId, tenantId)));

      return { deliveries, total };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook endpoint not found' } });
    }

    return res.json({ data: result.deliveries, total: result.total });
  } catch (err) {
    logger.error({ err, tenantId }, 'List webhook deliveries error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhook deliveries' } });
  }
});

export default router;
