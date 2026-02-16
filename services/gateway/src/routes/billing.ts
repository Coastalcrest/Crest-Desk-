import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createBillingSchema,
  updateBillingSchema,
  listBillingQuery,
  markPaidSchema,
  generateInvoicesSchema,
} from '../schemas';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/billing/outstanding ---------- //
router.get('/outstanding', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();

    const agingData = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          agentId: schema.agentBilling.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          agentEmail: schema.users.email,
          totalOutstanding: sql<string>`coalesce(sum(${schema.agentBilling.amount}), 0)::text`,
          currentAmount: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} >= ${now.toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over30: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${now.toISOString().slice(0, 10)}
              AND ${schema.agentBilling.dueDate} >= ${new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over60: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)}
              AND ${schema.agentBilling.dueDate} >= ${new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          over90: sql<string>`coalesce(sum(
            CASE WHEN ${schema.agentBilling.dueDate} < ${new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10)}
            THEN ${schema.agentBilling.amount} ELSE 0 END
          ), 0)::text`,
          invoiceCount: sql<number>`count(*)::int`,
        })
        .from(schema.agentBilling)
        .innerJoin(schema.users, eq(schema.agentBilling.agentId, schema.users.id))
        .where(and(
          eq(schema.agentBilling.tenantId, tenantId),
          eq(schema.agentBilling.paidStatus, 'unpaid'),
          isNull(schema.agentBilling.deletedAt),
        ))
        .groupBy(
          schema.agentBilling.agentId,
          schema.users.firstName,
          schema.users.lastName,
          schema.users.email,
        )
        .orderBy(desc(sql`coalesce(sum(${schema.agentBilling.amount}), 0)`));
    });

    return res.json({ data: agingData });
  } catch (err) {
    console.error('Outstanding balances error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get outstanding balances' } });
  }
});
// ---------- GET /api/v1/billing ---------- //
router.get('/', validateQuery(listBillingQuery), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { page, limit, agentId, billingType, paidStatus, dateFrom, dateTo } = req.query as any;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.agentBilling.tenantId, tenantId),
      isNull(schema.agentBilling.deletedAt),
    ];

    if (agentId) {
      conditions.push(eq(schema.agentBilling.agentId, agentId));
    }
    if (billingType) {
      conditions.push(eq(schema.agentBilling.billingType, billingType));
    }
    if (paidStatus) {
      conditions.push(eq(schema.agentBilling.paidStatus, paidStatus));
    }
    if (dateFrom) {
      conditions.push(sql`${schema.agentBilling.invoiceDate} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${schema.agentBilling.invoiceDate} <= ${dateTo}`);
    }

    const [records, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.agentBilling.id,
          tenantId: schema.agentBilling.tenantId,
          agentId: schema.agentBilling.agentId,
          agentFirstName: schema.users.firstName,
          agentLastName: schema.users.lastName,
          billingType: schema.agentBilling.billingType,
          amount: schema.agentBilling.amount,
          billingPeriodStart: schema.agentBilling.billingPeriodStart,
          billingPeriodEnd: schema.agentBilling.billingPeriodEnd,
          invoiceDate: schema.agentBilling.invoiceDate,
          dueDate: schema.agentBilling.dueDate,
          paidStatus: schema.agentBilling.paidStatus,
          paymentDate: schema.agentBilling.paymentDate,
          notes: schema.agentBilling.notes,
          createdAt: schema.agentBilling.createdAt,
        })
        .from(schema.agentBilling)
        .innerJoin(schema.users, eq(schema.agentBilling.agentId, schema.users.id))
        .where(and(...conditions))
        .orderBy(desc(schema.agentBilling.invoiceDate))
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.agentBilling)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List billing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list billing records' } });
  }
});
// ---------- POST /api/v1/billing ---------- //
router.post('/', requireRole('managing_broker'), validateBody(createBillingSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      agentId, billingType, description, amount,
      invoiceDate, dueDate, transactionId, notes,
    } = req.body;

    const [record] = await withTenantContext(tenantId, async (tx) => {
      // Verify agent exists
      const [agent] = await tx.select({ id: schema.users.id })
        .from(schema.users)
        .where(and(
          eq(schema.users.id, agentId),
          eq(schema.users.tenantId, tenantId),
          isNull(schema.users.deletedAt),
        ));
      if (!agent) throw new Error('AGENT_NOT_FOUND');

      return tx.insert(schema.agentBilling).values({
        tenantId,
        agentId,
        billingType,
        amount: amount.toString(),
        billingPeriodStart: invoiceDate,
        billingPeriodEnd: dueDate,
        invoiceDate,
        dueDate,
        paidStatus: 'unpaid',
        notes: notes || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'billing.create',
      resourceType: 'agent_billing',
      resourceId: record.id,
      details: { agentId, billingType, amount },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'AGENT_NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    }
    console.error('Create billing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create billing record' } });
  }
});
// ---------- PATCH /api/v1/billing/:id ---------- //
router.patch('/:id', requireRole('managing_broker'), validateBody(updateBillingSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    // Zod already validated and enforced at-least-one-field via .refine()
    const updates = { ...req.body };
    if (updates.amount !== undefined) {
      updates.amount = updates.amount.toString();
    }

    const [record] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.agentBilling)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.agentBilling.id, id),
          eq(schema.agentBilling.tenantId, tenantId),
          isNull(schema.agentBilling.deletedAt),
        ))
        .returning();
    });

    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Billing record not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'billing.update',
      resourceType: 'agent_billing',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: record });
  } catch (err) {
    console.error('Update billing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update billing record' } });
  }
});

// ---------- POST /api/v1/billing/:id/mark-paid ---------- //
router.post('/:id/mark-paid', requireRole('managing_broker'), validateBody(markPaidSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { paidDate, paidAmount, paymentMethod, paymentReference } = req.body;

    const [record] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.agentBilling)
        .set({
          paidStatus: 'paid',
          paymentDate: paidDate,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.agentBilling.id, id),
          eq(schema.agentBilling.tenantId, tenantId),
          isNull(schema.agentBilling.deletedAt),
        ))
        .returning();
    });

    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Billing record not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'billing.mark_paid',
      resourceType: 'agent_billing',
      resourceId: id,
      details: { paidDate, paidAmount, paymentMethod, paymentReference },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: record });
  } catch (err) {
    console.error('Mark paid error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to mark billing as paid' } });
  }
});
// ---------- POST /api/v1/billing/generate-invoices ---------- //
router.post('/generate-invoices', requireRole('managing_broker'), validateBody(generateInvoicesSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { agentIds, invoiceDate, dueDate, billingTypes } = req.body;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Get target agents
      const targetAgents = await tx.select({ id: schema.users.id })
        .from(schema.users)
        .where(and(
          eq(schema.users.tenantId, tenantId),
          eq(schema.users.role, 'agent'),
          isNull(schema.users.deletedAt),
          sql`${schema.users.id} = ANY(${agentIds})`,
        ));

      const createdRecords = [];
      const types = billingTypes || ['desk_fee'];

      for (const agent of targetAgents) {
        for (const billingType of types) {
          // Check for duplicate (same agent, type, period)
          const [existing] = await tx.select({ id: schema.agentBilling.id })
            .from(schema.agentBilling)
            .where(and(
              eq(schema.agentBilling.tenantId, tenantId),
              eq(schema.agentBilling.agentId, agent.id),
              eq(schema.agentBilling.billingType, billingType),
              eq(schema.agentBilling.billingPeriodStart, invoiceDate),
              eq(schema.agentBilling.billingPeriodEnd, dueDate),
              isNull(schema.agentBilling.deletedAt),
            ))
            .limit(1);

          if (existing) continue;

          const [record] = await tx.insert(schema.agentBilling).values({
            tenantId,
            agentId: agent.id,
            billingType,
            amount: '0',
            billingPeriodStart: invoiceDate,
            billingPeriodEnd: dueDate,
            invoiceDate,
            dueDate,
            paidStatus: 'unpaid',
          }).returning();
          createdRecords.push(record);
        }
      }

      return { created: createdRecords.length, totalAgents: targetAgents.length, records: createdRecords };
    });

    logAudit({
      tenantId,
      userId,
      action: 'billing.generate_invoices',
      resourceType: 'agent_billing',
      details: { agentIds, invoiceDate, dueDate, created: result.created },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: result });
  } catch (err) {
    console.error('Generate invoices error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate invoices' } });
  }
});

export default router;
