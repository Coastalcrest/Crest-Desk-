import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const ROLE_LEVEL: Record<string, number> = { agent: 0, managing_broker: 1, principal_broker: 2, owner: 3 };
function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/support-tickets — List tickets ---------- //
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const priority = req.query.priority as string;

    const conditions = [
      eq(schema.supportTickets.tenantId, tenantId),
      isNull(schema.supportTickets.deletedAt),
    ];

    // Agents see only their own tickets; managing_broker+ see all team tickets
    if (!hasMinRole(role, 'managing_broker')) {
      conditions.push(eq(schema.supportTickets.userId, userId));
    }

    if (status) {
      conditions.push(eq(schema.supportTickets.status, status));
    }
    if (priority) {
      conditions.push(eq(schema.supportTickets.priority, priority));
    }

    const [tickets, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select()
        .from(schema.supportTickets)
        .where(and(...conditions))
        .orderBy(desc(schema.supportTickets.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.supportTickets)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: tickets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List support tickets error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list tickets' } });
  }
});

// ---------- POST /api/v1/support-tickets — Create ticket ---------- //
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { subject, description, category, priority, conversationId, contextPage } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'subject is required' } });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'description is required' } });
    }

    const [ticket] = await withTenantContext(tenantId, async (tx) => {
      // Generate ticket number
      const [{ count: ticketCount }] = await tx.select({ count: sql<number>`count(*)::int` })
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.tenantId, tenantId));

      const ticketNumber = `SUP-${String(ticketCount + 1).padStart(6, '0')}`;

      return tx.insert(schema.supportTickets).values({
        tenantId,
        userId,
        conversationId: conversationId || null,
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category: category || null,
        priority: priority || 'medium',
        status: 'open',
        contextPage: contextPage || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'support_ticket.create',
      resourceType: 'support_ticket',
      resourceId: ticket.id,
      details: { ticketNumber: ticket.ticketNumber, subject, category, priority },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: ticket });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create support ticket error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create ticket' } });
  }
});

// ---------- GET /api/v1/support-tickets/:id — Get ticket with comments ---------- //
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(schema.supportTickets.id, id),
        eq(schema.supportTickets.tenantId, tenantId),
        isNull(schema.supportTickets.deletedAt),
      ];

      // Agents can only see their own tickets
      if (!hasMinRole(role, 'managing_broker')) {
        conditions.push(eq(schema.supportTickets.userId, userId));
      }

      const [ticket] = await tx.select()
        .from(schema.supportTickets)
        .where(and(...conditions));

      if (!ticket) return null;

      const comments = await tx.select()
        .from(schema.supportTicketComments)
        .where(and(
          eq(schema.supportTicketComments.ticketId, id),
          eq(schema.supportTicketComments.tenantId, tenantId),
          isNull(schema.supportTicketComments.deletedAt),
        ))
        .orderBy(asc(schema.supportTicketComments.createdAt));

      return { ...ticket, comments };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get support ticket error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get ticket' } });
  }
});

// ---------- PATCH /api/v1/support-tickets/:id — Update ticket ---------- //
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['status', 'priority', 'assignedTo', 'resolutionNotes'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    // Handle status transitions
    if (updates.status === 'resolved') {
      updates.resolvedAt = new Date();
    }
    if (updates.status === 'closed') {
      updates.closedAt = new Date();
    }

    const [ticket] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.supportTickets)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.supportTickets.id, id),
          eq(schema.supportTickets.tenantId, tenantId),
          isNull(schema.supportTickets.deletedAt),
        ))
        .returning();
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'support_ticket.update',
      resourceType: 'support_ticket',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: ticket });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update support ticket error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update ticket' } });
  }
});

// ---------- POST /api/v1/support-tickets/:id/comments — Add comment ---------- //
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { content, isInternal } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'content is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify ticket exists
      const [ticket] = await tx.select({ id: schema.supportTickets.id })
        .from(schema.supportTickets)
        .where(and(
          eq(schema.supportTickets.id, id),
          eq(schema.supportTickets.tenantId, tenantId),
          isNull(schema.supportTickets.deletedAt),
        ));

      if (!ticket) return null;

      const [comment] = await tx.insert(schema.supportTicketComments).values({
        tenantId,
        ticketId: id,
        userId,
        content: content.trim(),
        isInternal: isInternal ?? false,
      }).returning();

      // Update ticket's updatedAt
      await tx.update(schema.supportTickets)
        .set({ updatedAt: new Date() })
        .where(eq(schema.supportTickets.id, id));

      return comment;
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'support_ticket.comment',
      resourceType: 'support_ticket_comment',
      resourceId: result.id,
      details: { ticketId: id, isInternal: isInternal ?? false },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Add ticket comment error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add comment' } });
  }
});

// ---------- GET /api/v1/support-tickets/stats — Ticket statistics ---------- //
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stats = await withTenantContext(tenantId, async (tx) => {
      const [result] = await tx.select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${schema.supportTickets.status} = 'open')::int`,
        inProgress: sql<number>`count(*) filter (where ${schema.supportTickets.status} = 'in_progress')::int`,
        resolved: sql<number>`count(*) filter (where ${schema.supportTickets.status} = 'resolved')::int`,
        closed: sql<number>`count(*) filter (where ${schema.supportTickets.status} = 'closed')::int`,
      }).from(schema.supportTickets)
        .where(and(
          eq(schema.supportTickets.tenantId, tenantId),
          isNull(schema.supportTickets.deletedAt),
        ));

      return result;
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Ticket stats error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get ticket statistics' } });
  }
});

export default router;
