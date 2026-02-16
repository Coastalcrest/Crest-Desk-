import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, ilike, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { validateBody, validateQuery } from '../middleware/validate';
import { createTransactionSchema, updateTransactionSchema, listTransactionsQuery } from '../schemas/transactions';
import { sendData, sendPaginated, sendError } from '../lib/response';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/v1/transactions — Create transaction
router.post('/', validateBody(createTransactionSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      propertyAddress, propertyState, buyerName, sellerName,
      listPrice, purchasePrice, closingDate, transactionType,
    } = req.body;

    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.transactions).values({
        tenantId,
        propertyAddress,
        propertyState,
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

    sendData(res, txn, 201);
  } catch (err) {
    console.error('Create transaction error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create transaction');
  }
});

// GET /api/v1/transactions — List transactions with pagination and search
router.get('/', validateQuery(listTransactionsQuery), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { page, pageSize, search, status, state } = req.query as any;
    const offset = (page - 1) * pageSize;

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
      conditions.push(eq(schema.transactions.propertyState, state));
    }

    const [transactions, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const txns = await tx.select().from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.transactions)
        .where(and(...conditions));

      return [txns, countResult];
    });

    sendPaginated(res, transactions, { page, pageSize, total });
  } catch (err) {
    console.error('List transactions error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list transactions');
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
      return sendError(res, 404, 'NOT_FOUND', 'Transaction not found');
    }

    sendData(res, txn);
  } catch (err) {
    console.error('Get transaction error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get transaction');
  }
});

// PATCH /api/v1/transactions/:id — Update transaction
router.patch('/:id', validateBody(updateTransactionSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['propertyAddress', 'propertyState', 'buyerName', 'sellerName', 'listPrice', 'purchasePrice', 'closingDate', 'transactionType', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'listPrice' || field === 'purchasePrice') {
          updates[field] = req.body[field]?.toString() || null;
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'No valid fields to update');
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
      return sendError(res, 404, 'NOT_FOUND', 'Transaction not found');
    }

    logAudit({ tenantId, userId, action: 'transaction.update', resourceType: 'transaction', resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    sendData(res, txn);
  } catch (err) {
    console.error('Update transaction error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update transaction');
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
      return sendError(res, 404, 'NOT_FOUND', 'Transaction not found');
    }

    logAudit({ tenantId, userId, action: 'transaction.delete', resourceType: 'transaction', resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(204).send();
  } catch (err) {
    console.error('Delete transaction error:', err);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete transaction');
  }
});

export default router;
