import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, ilike, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/vendors/1099-report ---------- //
router.get('/1099-report', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const vendors1099 = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          id: schema.vendors.id,
          vendorName: schema.vendors.vendorName,
          vendorType: schema.vendors.vendorType,
          contactName: schema.vendors.contactName,
          contactEmail: schema.vendors.contactEmail,
          taxId: schema.vendors.taxId,
          address: schema.vendors.address,
          ytdPayments: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
          paymentCount: sql<number>`count(${schema.dealExpenses.id})::int`,
        })
        .from(schema.vendors)
        .leftJoin(
          schema.dealExpenses,
          and(
            eq(schema.dealExpenses.vendorId, schema.vendors.id),
            sql`${schema.dealExpenses.expenseDate} >= ${yearStart}`,
            sql`${schema.dealExpenses.expenseDate} <= ${yearEnd}`,
            isNull(schema.dealExpenses.deletedAt),
          ),
        )
        .where(and(
          eq(schema.vendors.tenantId, tenantId),
          eq(schema.vendors.requires1099, true),
          isNull(schema.vendors.deletedAt),
        ))
        .groupBy(
          schema.vendors.id,
          schema.vendors.vendorName,
          schema.vendors.vendorType,
          schema.vendors.contactName,
          schema.vendors.contactEmail,
          schema.vendors.taxId,
          schema.vendors.address,
        )
        .orderBy(desc(sql`coalesce(sum(${schema.dealExpenses.amount}), 0)`));
    });

    return res.json({
      data: {
        year,
        vendors: vendors1099,
        totalVendors: vendors1099.length,
        totalPayments: vendors1099.reduce(
          (sum, v) => sum + parseFloat(v.ytdPayments || '0'), 0,
        ).toFixed(2),
      },
    });
  } catch (err) {
    logger.error({ err, tenantId }, '1099 report error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate 1099 report' } });
  }
});

// ---------- GET /api/v1/vendors ---------- //
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const vendorType = req.query.vendorType as string;
    const sortBy = req.query.sortBy as string;

    const conditions = [
      eq(schema.vendors.tenantId, tenantId),
      isNull(schema.vendors.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(schema.vendors.vendorName, `%${search}%`));
    }
    if (vendorType) {
      const validTypes = ['photography', 'staging', 'inspector', 'appraiser', 'title', 'lender', 'other'];
      if (validTypes.includes(vendorType)) {
        conditions.push(eq(schema.vendors.vendorType, vendorType));
      }
    }

    let orderClause;
    switch (sortBy) {
      case 'name':
        orderClause = sql`${schema.vendors.vendorName} ASC`;
        break;
      case 'type':
        orderClause = sql`${schema.vendors.vendorType} ASC`;
        break;
      case 'createdAt':
      default:
        orderClause = desc(schema.vendors.createdAt);
        break;
    }

    const [vendors, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.vendors.id,
          tenantId: schema.vendors.tenantId,
          vendorName: schema.vendors.vendorName,
          vendorType: schema.vendors.vendorType,
          contactName: schema.vendors.contactName,
          contactEmail: schema.vendors.contactEmail,
          contactPhone: schema.vendors.contactPhone,
          address: schema.vendors.address,
          paymentTerms: schema.vendors.paymentTerms,
          requires1099: schema.vendors.requires1099,
          notes: schema.vendors.notes,
          createdAt: schema.vendors.createdAt,
          totalPayments: sql<string>`coalesce((
            SELECT sum(de.amount)
            FROM deal_expenses de
            WHERE de.vendor_id = ${schema.vendors.id}
              AND de.deleted_at IS NULL
          ), 0)::text`,
        })
        .from(schema.vendors)
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.vendors)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: vendors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'List vendors error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list vendors' } });
  }
});
// ---------- POST /api/v1/vendors ---------- //
router.post('/', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      vendorName, vendorType, contactName, contactEmail,
      contactPhone, address, paymentTerms, requires1099,
      taxId, notes,
    } = req.body;

    if (!vendorName || !vendorType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'vendorName and vendorType are required' } });
    }

    const validTypes = ['photography', 'staging', 'inspector', 'appraiser', 'title', 'lender', 'other'];
    if (!validTypes.includes(vendorType)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `vendorType must be one of: ${validTypes.join(', ')}`,
        },
      });
    }

    const [vendor] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.vendors).values({
        tenantId,
        vendorName,
        vendorType,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        paymentTerms: paymentTerms || null,
        requires1099: requires1099 ?? false,
        taxId: taxId || null,
        notes: notes || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'vendor.create',
      resourceType: 'vendor',
      resourceId: vendor.id,
      details: { vendorName, vendorType, requires1099 },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: vendor });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create vendor error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create vendor' } });
  }
});

// ---------- GET /api/v1/vendors/:id ---------- //
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [vendor] = await tx.select().from(schema.vendors)
        .where(and(
          eq(schema.vendors.id, id),
          eq(schema.vendors.tenantId, tenantId),
          isNull(schema.vendors.deletedAt),
        ));

      if (!vendor) return null;

      const [paymentSummary] = await tx
        .select({
          totalPayments: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
          paymentCount: sql<number>`count(${schema.dealExpenses.id})::int`,
          lastPaymentDate: sql<string>`max(${schema.dealExpenses.expenseDate})`,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.vendorId, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ));

      const recentPayments = await tx
        .select({
          id: schema.dealExpenses.id,
          dealId: schema.dealExpenses.dealId,
          amount: schema.dealExpenses.amount,
          expenseDate: schema.dealExpenses.expenseDate,
          expenseCategory: schema.dealExpenses.expenseCategory,
          description: schema.dealExpenses.description,
        })
        .from(schema.dealExpenses)
        .where(and(
          eq(schema.dealExpenses.vendorId, id),
          eq(schema.dealExpenses.tenantId, tenantId),
          isNull(schema.dealExpenses.deletedAt),
        ))
        .orderBy(desc(schema.dealExpenses.expenseDate))
        .limit(10);

      return { ...vendor, paymentSummary, recentPayments };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get vendor error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get vendor' } });
  }
});
// ---------- PATCH /api/v1/vendors/:id ---------- //
router.patch('/:id', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      'vendorName', 'vendorType', 'contactName', 'contactEmail',
      'contactPhone', 'address', 'paymentTerms', 'requires1099',
      'taxId', 'notes',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    if (updates.vendorType) {
      const validTypes = ['photography', 'staging', 'inspector', 'appraiser', 'title', 'lender', 'other'];
      if (!validTypes.includes(updates.vendorType as string)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `vendorType must be one of: ${validTypes.join(', ')}`,
          },
        });
      }
    }

    const [vendor] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.vendors)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.vendors.id, id),
          eq(schema.vendors.tenantId, tenantId),
          isNull(schema.vendors.deletedAt),
        ))
        .returning();
    });

    if (!vendor) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'vendor.update',
      resourceType: 'vendor',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: vendor });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update vendor error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update vendor' } });
  }
});
// ---------- GET /api/v1/vendors/:id/payments ---------- //
router.get('/:id/payments', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    // Verify vendor exists
    const vendorExists = await withTenantContext(tenantId, async (tx) => {
      const [vendor] = await tx
        .select({ id: schema.vendors.id })
        .from(schema.vendors)
        .where(and(
          eq(schema.vendors.id, id),
          eq(schema.vendors.tenantId, tenantId),
          isNull(schema.vendors.deletedAt),
        ));
      return !!vendor;
    });

    if (!vendorExists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    }

    const conditions = [
      eq(schema.dealExpenses.vendorId, id),
      eq(schema.dealExpenses.tenantId, tenantId),
      isNull(schema.dealExpenses.deletedAt),
    ];

    if (dateFrom) {
      conditions.push(sql`${schema.dealExpenses.expenseDate} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${schema.dealExpenses.expenseDate} <= ${dateTo}`);
    }

    const [payments, [{ total }], [summary]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.dealExpenses.id,
          dealId: schema.dealExpenses.dealId,
          agentId: schema.dealExpenses.agentId,
          expenseCategory: schema.dealExpenses.expenseCategory,
          description: schema.dealExpenses.description,
          amount: schema.dealExpenses.amount,
          expenseDate: schema.dealExpenses.expenseDate,
          receiptUrl: schema.dealExpenses.receiptUrl,
          qbSyncStatus: schema.dealExpenses.qbSyncStatus,
          notes: schema.dealExpenses.notes,
          createdAt: schema.dealExpenses.createdAt,
        })
        .from(schema.dealExpenses)
        .where(and(...conditions))
        .orderBy(desc(schema.dealExpenses.expenseDate))
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.dealExpenses)
        .where(and(...conditions));

      const summaryResult = await tx
        .select({
          totalAmount: sql<string>`coalesce(sum(${schema.dealExpenses.amount}), 0)::text`,
          totalCount: sql<number>`count(*)::int`,
        })
        .from(schema.dealExpenses)
        .where(and(...conditions));

      return [rows, countResult, summaryResult];
    });

    return res.json({
      data: { payments, summary },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Vendor payments error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get vendor payments' } });
  }
});

export default router;
