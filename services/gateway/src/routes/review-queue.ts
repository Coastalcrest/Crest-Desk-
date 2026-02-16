import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();

// ─── Role hierarchy helpers ─────────────────────────────────────────

const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

// All routes require authentication
router.use(requireAuth);

// ─── GET / — List review queue items ────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const status = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'priority';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.reviewQueue.tenantId, tenantId),
      isNull(schema.reviewQueue.deletedAt),
    ];

    if (status) {
      conditions.push(eq(schema.reviewQueue.status, status));
    }

    let orderClause;
    switch (sortBy) {
      case 'closingDate':
        orderClause = asc(schema.transactions.closingDate);
        break;
      case 'readinessScore':
        orderClause = desc(schema.reviewQueue.readinessScore);
        break;
      case 'priority':
      default:
        orderClause = asc(schema.reviewQueue.priority);
        break;
    }

    const results = await withTenantContext(tenantId, async (tx) => {
      const items = await tx
        .select({
          id: schema.reviewQueue.id,
          transactionId: schema.reviewQueue.transactionId,
          status: schema.reviewQueue.status,
          priority: schema.reviewQueue.priority,
          riskScore: schema.reviewQueue.riskScore,
          readinessScore: schema.reviewQueue.readinessScore,
          assignedReviewerId: schema.reviewQueue.assignedReviewerId,
          assignedAt: schema.reviewQueue.assignedAt,
          reviewStartedAt: schema.reviewQueue.reviewStartedAt,
          reviewCompletedAt: schema.reviewQueue.reviewCompletedAt,
          returnReason: schema.reviewQueue.returnReason,
          returnedAt: schema.reviewQueue.returnedAt,
          createdAt: schema.reviewQueue.createdAt,
          updatedAt: schema.reviewQueue.updatedAt,
          propertyAddress: schema.transactions.propertyAddress,
          closingDate: schema.transactions.closingDate,
          buyerName: schema.transactions.buyerName,
          sellerName: schema.transactions.sellerName,
          transactionType: schema.transactions.transactionType,
          transactionStatus: schema.transactions.status,
        })
        .from(schema.reviewQueue)
        .innerJoin(
          schema.transactions,
          eq(schema.reviewQueue.transactionId, schema.transactions.id),
        )
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);

      const [{ total }] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.reviewQueue)
        .where(and(...conditions));

      return { items, total };
    });

    return res.json({
      data: results.items,
      pagination: {
        page,
        limit,
        total: results.total,
        pages: Math.ceil(results.total / limit),
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List review queue error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list review queue' } });
  }
});

// ─── GET /stats — Dashboard stats ───────────────────────────────────

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId, role } = req.user!;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const stats = await withTenantContext(tenantId, async (tx) => {
      const statusCounts = await tx
        .select({
          status: schema.reviewQueue.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ))
        .groupBy(schema.reviewQueue.status);

      const [avgResult] = await tx
        .select({
          avgReadiness: sql<number>`coalesce(avg(${schema.reviewQueue.readinessScore}), 0)::int`,
        })
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));

      // Items due this week: review queue items where the associated
      // transaction has a closing date within the next 7 days
      const [dueThisWeek] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.reviewQueue)
        .innerJoin(
          schema.transactions,
          eq(schema.reviewQueue.transactionId, schema.transactions.id),
        )
        .where(and(
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
          sql`${schema.transactions.closingDate} IS NOT NULL`,
          sql`${schema.transactions.closingDate}::date <= (now() + interval '7 days')::date`,
          sql`${schema.transactions.closingDate}::date >= now()::date`,
          sql`${schema.reviewQueue.status} IN ('pending', 'in_review')`,
        ));

      const countsByStatus: Record<string, number> = {
        pending: 0,
        in_review: 0,
        approved: 0,
        returned: 0,
        escalated: 0,
      };

      for (const row of statusCounts) {
        countsByStatus[row.status] = row.count;
      }

      return {
        countsByStatus,
        avgReadinessScore: avgResult.avgReadiness,
        dueThisWeek: dueThisWeek.count,
      };
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Review queue stats error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get review queue stats' } });
  }
});

// ─── POST /submit/:transactionId — Submit transaction for review ────

router.post('/submit/:transactionId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId } = req.params;

    // Verify transaction exists and belongs to tenant
    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.transactions)
        .where(and(
          eq(schema.transactions.id, transactionId),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    // Check the agent owns this transaction (or is a broker+)
    if (txn.createdBy !== userId && !hasMinRole(req.user!.role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only submit your own transactions for review' } });
    }

    // Check if already in review queue (not deleted)
    const existing = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({ id: schema.reviewQueue.id })
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.transactionId, transactionId),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));
    });

    if (existing.length > 0) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Transaction is already in the review queue' } });
    }

    // Calculate priority based on closing date proximity
    let priority = 50; // default middle priority
    if (txn.closingDate) {
      const closingMs = new Date(txn.closingDate).getTime();
      const nowMs = Date.now();
      const daysUntilClosing = Math.max(0, Math.floor((closingMs - nowMs) / (1000 * 60 * 60 * 24)));

      if (daysUntilClosing <= 3) {
        priority = 1;
      } else if (daysUntilClosing <= 7) {
        priority = 10;
      } else if (daysUntilClosing <= 14) {
        priority = 20;
      } else if (daysUntilClosing <= 30) {
        priority = 30;
      } else {
        priority = 40;
      }
    }

    // Fetch compliance checklist status to adjust priority
    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.complianceChecklists)
        .where(eq(schema.complianceChecklists.transactionId, transactionId));
    });

    if (checklist && checklist.status !== 'complete') {
      // Incomplete checklist bumps priority down slightly (higher number)
      priority = Math.min(priority + 5, 99);
    }

    // Placeholder AI pre-review: calculate readiness score based on document count and compliance
    const documents = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({ id: schema.documents.id })
        .from(schema.documents)
        .where(and(
          eq(schema.documents.transactionId, transactionId),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));
    });

    let readinessScore = 0;
    const docCount = documents.length;
    // Base score from document count (max 50 points)
    readinessScore += Math.min(docCount * 10, 50);
    // Compliance checklist bonus (max 50 points)
    if (checklist) {
      if (checklist.status === 'complete') {
        readinessScore += 50;
      } else if (checklist.federalItemsComplete && checklist.stateItemsComplete) {
        readinessScore += 40;
      } else if (checklist.federalItemsComplete || checklist.stateItemsComplete) {
        readinessScore += 20;
      } else {
        readinessScore += 10;
      }
    }
    readinessScore = Math.min(readinessScore, 100);

    const [queueItem] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.reviewQueue).values({
        tenantId,
        transactionId,
        status: 'pending',
        priority,
        readinessScore,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.submit',
      resourceType: 'review_queue',
      resourceId: queueItem.id,
      details: { transactionId, priority, readinessScore },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: queueItem });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Submit for review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit transaction for review' } });
  }
});

// ─── GET /:id — Get review queue item with findings ─────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const [queueItem] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));
    });

    if (!queueItem) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    const [transaction, findings] = await withTenantContext(tenantId, async (tx) => {
      const txnResult = await tx
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.id, queueItem.transactionId));

      const findingsResult = await tx
        .select()
        .from(schema.reviewFindings)
        .where(eq(schema.reviewFindings.reviewQueueId, id))
        .orderBy(desc(schema.reviewFindings.createdAt));

      return [txnResult[0], findingsResult];
    });

    return res.json({
      data: {
        ...queueItem,
        transaction,
        findings,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get review queue item error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get review queue item' } });
  }
});

// ─── PATCH /:id/start-review — Start reviewing ─────────────────────

router.patch('/:id/start-review', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .update(schema.reviewQueue)
        .set({
          status: 'in_review',
          assignedReviewerId: userId,
          assignedAt: new Date(),
          reviewStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ))
        .returning();
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.start_review',
      resourceType: 'review_queue',
      resourceId: id,
      details: { assignedReviewerId: userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Start review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start review' } });
  }
});

// ─── POST /:id/findings — Add a manual finding ─────────────────────

router.post('/:id/findings', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const { category, severity, title, description, documentId, ruleReference, jurisdiction } = req.body;

    if (!category || !severity || !title || !description) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'category, severity, title, and description are required' } });
    }

    // Verify review queue item exists
    const [queueItem] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));
    });

    if (!queueItem) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    const [finding] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.reviewFindings).values({
        tenantId,
        reviewQueueId: id,
        transactionId: queueItem.transactionId,
        source: 'broker_manual',
        category,
        severity,
        title,
        description,
        documentId: documentId || null,
        ruleReference: ruleReference || null,
        jurisdiction: jurisdiction || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'review_finding.create',
      resourceType: 'review_finding',
      resourceId: finding.id,
      details: { category, severity, title, reviewQueueId: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: finding });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Add finding error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add finding' } });
  }
});

// ─── PATCH /:id/findings/:findingId/action — Take action on finding ─

router.patch('/:id/findings/:findingId/action', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id, findingId } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const { action, notes } = req.body;

    const validActions = ['approved', 'flagged', 'dismissed', 'promoted_to_rule'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `action must be one of: ${validActions.join(', ')}` } });
    }

    // Verify finding exists and belongs to this review queue item
    const [finding] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewFindings)
        .where(and(
          eq(schema.reviewFindings.id, findingId),
          eq(schema.reviewFindings.reviewQueueId, id),
          eq(schema.reviewFindings.tenantId, tenantId),
        ));
    });

    if (!finding) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Finding not found' } });
    }

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .update(schema.reviewFindings)
        .set({
          brokerAction: action,
          brokerActionAt: new Date(),
          brokerNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.reviewFindings.id, findingId))
        .returning();
    });

    // If dismissed and source was ai_pre_review, create false_positive feedback
    if (action === 'dismissed' && finding.source === 'ai_pre_review') {
      await withTenantContext(tenantId, async (tx) => {
        await tx.insert(schema.aiReviewFeedback).values({
          tenantId,
          findingId,
          reviewerId: userId,
          feedbackType: 'false_positive',
          originalSeverity: finding.severity,
          notes: notes || null,
        });
      });
    }

    // If promoted_to_rule, create feedback record
    if (action === 'promoted_to_rule') {
      await withTenantContext(tenantId, async (tx) => {
        await tx.insert(schema.aiReviewFeedback).values({
          tenantId,
          findingId,
          reviewerId: userId,
          feedbackType: 'promoted_to_rule',
          originalSeverity: finding.severity,
          notes: notes || null,
          promotedToRuleId: null, // placeholder — rule creation is a separate workflow
        });
      });
    }

    logAudit({
      tenantId,
      userId,
      action: 'review_finding.action',
      resourceType: 'review_finding',
      resourceId: findingId,
      details: { action, reviewQueueId: id, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Finding action error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update finding' } });
  }
});

// ─── POST /:id/approve — Approve the transaction file ───────────────

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'principal_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only principal broker or higher can approve' } });
    }

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .update(schema.reviewQueue)
        .set({
          status: 'approved',
          reviewCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ))
        .returning();
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.approve',
      resourceType: 'review_queue',
      resourceId: id,
      details: { approvedBy: userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { ...updated, approval: { approvedBy: userId, approvedAt: updated.reviewCompletedAt } } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Approve review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve' } });
  }
});

// ─── POST /:id/return — Return to agent with issues ─────────────────

router.post('/:id/return', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const { returnReason, returnToUserId } = req.body;

    if (!returnReason) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'returnReason is required' } });
    }

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .update(schema.reviewQueue)
        .set({
          status: 'returned',
          returnReason,
          returnedToUserId: returnToUserId || null,
          returnedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ))
        .returning();
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.return',
      resourceType: 'review_queue',
      resourceId: id,
      details: { returnReason, returnToUserId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Return review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to return review' } });
  }
});

// ─── POST /:id/escalate — Escalate to principal broker ──────────────

router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .update(schema.reviewQueue)
        .set({
          status: 'escalated',
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ))
        .returning();
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.escalate',
      resourceType: 'review_queue',
      resourceId: id,
      details: { escalatedBy: userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Escalate review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to escalate review' } });
  }
});

// ─── GET /:id/export — Export approved file ─────────────────────────

router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const [queueItem] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.id, id),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));
    });

    if (!queueItem) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review queue item not found' } });
    }

    if (queueItem.status !== 'approved') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Only approved items can be exported' } });
    }

    const exportedAt = new Date();

    await withTenantContext(tenantId, async (tx) => {
      await tx
        .update(schema.reviewQueue)
        .set({ exportedAt, updatedAt: new Date() })
        .where(eq(schema.reviewQueue.id, id));
    });

    logAudit({
      tenantId,
      userId,
      action: 'review_queue.export',
      resourceType: 'review_queue',
      resourceId: id,
      details: { format: 'pdf' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      data: {
        exportUrl: `/api/v1/review-queue/${id}/export/download`,
        format: 'pdf',
        exportedAt: exportedAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Export review error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export review' } });
  }
});

export default router;
