import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, ilike, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/v1/transactions — Create transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      propertyAddress, propertyState, buyerName, sellerName,
      listPrice, purchasePrice, closingDate, transactionType,
    } = req.body;

    if (!propertyAddress || !propertyState || !transactionType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'propertyAddress, propertyState, and transactionType are required' } });
    }

    const validTypes = ['buy', 'sell', 'lease', 'investment'];
    if (!validTypes.includes(transactionType)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `transactionType must be one of: ${validTypes.join(', ')}` } });
    }

    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.transactions).values({
        tenantId,
        propertyAddress,
        propertyState: propertyState.toUpperCase(),
        buyerName: buyerName || null,
        sellerName: sellerName || null,
        listPrice: listPrice?.toString() || null,
        purchasePrice: purchasePrice?.toString() || null,
        closingDate: closingDate || null,
        transactionType,
        status: 'draft',
        createdBy: userId,
      }).returning();
    });

    logAudit({ tenantId, userId, action: 'transaction.create', resourceType: 'transaction', resourceId: txn.id, details: { propertyAddress, propertyState }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json(txn);
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create transaction' } });
  }
});

// GET /api/v1/transactions — List transactions with pagination and search
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const state = req.query.state as string;

    const conditions = [
      eq(schema.transactions.tenantId, tenantId),
      isNull(schema.transactions.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(schema.transactions.propertyAddress, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(schema.transactions.status, status));
    }
    if (state) {
      conditions.push(eq(schema.transactions.propertyState, state.toUpperCase()));
    }

    const [transactions, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const txns = await tx.select().from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.transactions)
        .where(and(...conditions));

      return [txns, countResult];
    });

    return res.json({ data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('List transactions error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list transactions' } });
  }
});

// GET /api/v1/transactions/:id — Get transaction by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.transactions)
        .where(and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    return res.json(txn);
  } catch (err) {
    console.error('Get transaction error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get transaction' } });
  }
});

// PATCH /api/v1/transactions/:id — Update transaction
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['propertyAddress', 'propertyState', 'buyerName', 'sellerName', 'listPrice', 'purchasePrice', 'closingDate', 'transactionType', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'listPrice' || field === 'purchasePrice') {
          updates[field] = req.body[field]?.toString() || null;
        } else if (field === 'propertyState') {
          updates[field] = req.body[field].toUpperCase();
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.transactions)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ))
        .returning();
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    logAudit({ tenantId, userId, action: 'transaction.update', resourceType: 'transaction', resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(txn);
  } catch (err) {
    console.error('Update transaction error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update transaction' } });
  }
});

// DELETE /api/v1/transactions/:id — Soft-delete transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.transactions)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.transactions.id, id),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ))
        .returning();
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    logAudit({ tenantId, userId, action: 'transaction.delete', resourceType: 'transaction', resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(204).send();
  } catch (err) {
    console.error('Delete transaction error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete transaction' } });
  }
});

export default router;
