import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';

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

// ─── Pre-review check helpers ───────────────────────────────────────

interface PreReviewFinding {
  category: string;
  severity: string;
  title: string;
  description: string;
  documentId?: string;
}

const REQUIRED_DOCUMENT_TYPES = [
  'purchase_agreement',
  'seller_disclosure',
  'buyer_disclosure',
  'title_report',
  'inspection_report',
];

function checkDocumentCompleteness(
  documents: Array<{ id: string; documentType: string }>,
): PreReviewFinding[] {
  const findings: PreReviewFinding[] = [];
  const presentTypes = new Set(documents.map((d) => d.documentType));

  for (const requiredType of REQUIRED_DOCUMENT_TYPES) {
    if (!presentTypes.has(requiredType)) {
      findings.push({
        category: 'completeness',
        severity: 'critical',
        title: `Missing required document: ${requiredType}`,
        description: `The transaction file is missing a required document of type "${requiredType}". This must be uploaded before the file can be approved.`,
      });
    }
  }

  return findings;
}

function checkSignatureStatus(
  envelopes: Array<{ id: string; status: string; envelopeName: string }>,
): PreReviewFinding[] {
  const findings: PreReviewFinding[] = [];

  for (const envelope of envelopes) {
    if (envelope.status !== 'completed' && envelope.status !== 'fully_signed') {
      findings.push({
        category: 'signatures',
        severity: envelope.status === 'sent' ? 'warning' : 'critical',
        title: `Unsigned envelope: ${envelope.envelopeName}`,
        description: `Signing envelope "${envelope.envelopeName}" has status "${envelope.status}". All envelopes must be fully signed before approval.`,
      });
    }
  }

  return findings;
}

function checkDates(
  transaction: { closingDate: string | null },
): PreReviewFinding[] {
  const findings: PreReviewFinding[] = [];

  if (!transaction.closingDate) {
    findings.push({
      category: 'dates',
      severity: 'warning',
      title: 'No closing date set',
      description: 'The transaction does not have a closing date. A closing date should be established before review.',
    });
  } else {
    const closing = new Date(transaction.closingDate);
    const now = new Date();

    if (closing < now) {
      findings.push({
        category: 'dates',
        severity: 'critical',
        title: 'Closing date is in the past',
        description: `The closing date (${transaction.closingDate}) has already passed. Please verify and update the closing date.`,
      });
    }
  }

  return findings;
}

function checkNameConsistency(
  transaction: { buyerName: string | null; sellerName: string | null },
): PreReviewFinding[] {
  const findings: PreReviewFinding[] = [];

  if (!transaction.buyerName) {
    findings.push({
      category: 'name_consistency',
      severity: 'warning',
      title: 'Buyer name not set',
      description: 'The transaction does not have a buyer name set. Buyer information should be complete before review.',
    });
  }

  if (!transaction.sellerName) {
    findings.push({
      category: 'name_consistency',
      severity: 'warning',
      title: 'Seller name not set',
      description: 'The transaction does not have a seller name set. Seller information should be complete before review.',
    });
  }

  return findings;
}

function checkComplianceChecklist(
  checklist: { status: string; federalItemsComplete: boolean | null; stateItemsComplete: boolean | null } | null,
): PreReviewFinding[] {
  const findings: PreReviewFinding[] = [];

  if (!checklist) {
    findings.push({
      category: 'compliance',
      severity: 'critical',
      title: 'No compliance checklist found',
      description: 'No compliance checklist exists for this transaction. A compliance checklist must be created and completed.',
    });
    return findings;
  }

  if (checklist.status !== 'complete') {
    findings.push({
      category: 'compliance',
      severity: 'warning',
      title: 'Compliance checklist incomplete',
      description: `The compliance checklist status is "${checklist.status}". All items should be completed before approval.`,
    });
  }

  if (!checklist.federalItemsComplete) {
    findings.push({
      category: 'compliance',
      severity: 'critical',
      title: 'Federal compliance items incomplete',
      description: 'Federal compliance checklist items have not been completed. These are mandatory.',
    });
  }

  if (!checklist.stateItemsComplete) {
    findings.push({
      category: 'compliance',
      severity: 'warning',
      title: 'State compliance items incomplete',
      description: 'State-specific compliance checklist items have not been completed.',
    });
  }

  return findings;
}

function calculateReadinessScore(findings: PreReviewFinding[]): number {
  let score = 100;

  for (const finding of findings) {
    switch (finding.severity) {
      case 'critical':
        score -= 15;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
        score -= 1;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// All routes require authentication
router.use(requireAuth);

// ─── POST /pre-review/:transactionId — Trigger AI pre-review ────────

router.post('/pre-review/:transactionId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { transactionId } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    // Fetch transaction
    const [transaction] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.transactions)
        .where(and(
          eq(schema.transactions.id, transactionId),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));
    });

    if (!transaction) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    // Fetch all documents for the transaction
    const documents = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          id: schema.documents.id,
          documentType: schema.documents.documentType,
        })
        .from(schema.documents)
        .where(and(
          eq(schema.documents.transactionId, transactionId),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));
    });

    // Fetch compliance checklist
    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.complianceChecklists)
        .where(eq(schema.complianceChecklists.transactionId, transactionId));
    });

    // Fetch signing envelopes
    const envelopes = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          id: schema.signingEnvelopes.id,
          status: schema.signingEnvelopes.status,
          envelopeName: schema.signingEnvelopes.envelopeName,
        })
        .from(schema.signingEnvelopes)
        .where(and(
          eq(schema.signingEnvelopes.transactionId, transactionId),
          eq(schema.signingEnvelopes.tenantId, tenantId),
          isNull(schema.signingEnvelopes.deletedAt),
        ));
    });

    // Run all pre-review checks
    const allFindings: PreReviewFinding[] = [
      ...checkDocumentCompleteness(documents),
      ...checkSignatureStatus(envelopes),
      ...checkDates(transaction),
      ...checkNameConsistency(transaction),
      ...checkComplianceChecklist(checklist || null),
    ];

    const readinessScore = calculateReadinessScore(allFindings);

    // Find the review queue item for this transaction (if exists)
    const [queueItem] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewQueue)
        .where(and(
          eq(schema.reviewQueue.transactionId, transactionId),
          eq(schema.reviewQueue.tenantId, tenantId),
          isNull(schema.reviewQueue.deletedAt),
        ));
    });

    // Create review_findings records for each issue found
    const createdFindings = [];

    if (queueItem) {
      for (const finding of allFindings) {
        const [created] = await withTenantContext(tenantId, async (tx) => {
          return tx.insert(schema.reviewFindings).values({
            tenantId,
            reviewQueueId: queueItem.id,
            transactionId,
            source: 'ai_pre_review',
            category: finding.category,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            documentId: finding.documentId || null,
          }).returning();
        });
        createdFindings.push(created);
      }

      // Update readiness score on the review queue item
      await withTenantContext(tenantId, async (tx) => {
        await tx
          .update(schema.reviewQueue)
          .set({ readinessScore, updatedAt: new Date() })
          .where(eq(schema.reviewQueue.id, queueItem.id));
      });
    }

    // Build summary
    const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
    const warningCount = allFindings.filter((f) => f.severity === 'warning').length;

    const summary = criticalCount === 0 && warningCount === 0
      ? 'Transaction file appears ready for review. No issues detected.'
      : `Found ${criticalCount} critical issue(s) and ${warningCount} warning(s). Readiness score: ${readinessScore}/100.`;

    logAudit({
      tenantId,
      userId,
      action: 'ai_review.pre_review',
      resourceType: 'transaction',
      resourceId: transactionId,
      details: { readinessScore, findingCount: allFindings.length, criticalCount, warningCount },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      data: {
        readinessScore,
        findings: allFindings,
        summary,
      },
    });
  } catch (err) {
    console.error('AI pre-review error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to run AI pre-review' } });
  }
});

// ─── GET /coaching/:agentUserId — Get coaching insights ─────────────

router.get('/coaching/:agentUserId', async (req: Request, res: Response) => {
  try {
    const { tenantId, role } = req.user!;
    const { agentUserId } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const insights = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.agentCoachingInsights)
        .where(and(
          eq(schema.agentCoachingInsights.agentUserId, agentUserId),
          eq(schema.agentCoachingInsights.tenantId, tenantId),
        ))
        .orderBy(desc(schema.agentCoachingInsights.occurrenceCount));
    });

    return res.json({ data: insights });
  } catch (err) {
    console.error('Get coaching insights error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get coaching insights' } });
  }
});

// ─── POST /coaching/generate/:agentUserId — Generate coaching insights

router.post('/coaching/generate/:agentUserId', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { agentUserId } = req.params;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    // Find all transactions created by this agent
    const agentTransactions = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({ id: schema.transactions.id })
        .from(schema.transactions)
        .where(and(
          eq(schema.transactions.createdBy, agentUserId),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));
    });

    const transactionIds = agentTransactions.map((t) => t.id);

    if (transactionIds.length === 0) {
      return res.json({ data: [] });
    }

    // Query all review findings for those transactions
    const findings = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          category: schema.reviewFindings.category,
          severity: schema.reviewFindings.severity,
          transactionId: schema.reviewFindings.transactionId,
        })
        .from(schema.reviewFindings)
        .where(and(
          eq(schema.reviewFindings.tenantId, tenantId),
          sql`${schema.reviewFindings.transactionId} = ANY(${transactionIds}::uuid[])`,
        ));
    });

    // Group findings by category
    const categoryCounts: Record<string, { count: number; transactionIds: Set<string> }> = {};

    for (const finding of findings) {
      if (!categoryCounts[finding.category]) {
        categoryCounts[finding.category] = { count: 0, transactionIds: new Set() };
      }
      categoryCounts[finding.category].count += 1;
      categoryCounts[finding.category].transactionIds.add(finding.transactionId);
    }

    // Create/update coaching insights for categories with 3+ occurrences
    const generatedInsights = [];

    for (const [category, data] of Object.entries(categoryCounts)) {
      if (data.count < 3) continue;

      // Check if insight already exists for this agent + category
      const [existing] = await withTenantContext(tenantId, async (tx) => {
        return tx
          .select()
          .from(schema.agentCoachingInsights)
          .where(and(
            eq(schema.agentCoachingInsights.agentUserId, agentUserId),
            eq(schema.agentCoachingInsights.tenantId, tenantId),
            eq(schema.agentCoachingInsights.category, category),
          ));
      });

      const exampleIds = Array.from(data.transactionIds).slice(0, 5);

      if (existing) {
        // Update existing insight
        const [updated] = await withTenantContext(tenantId, async (tx) => {
          return tx
            .update(schema.agentCoachingInsights)
            .set({
              occurrenceCount: data.count,
              lastOccurrence: new Date(),
              exampleTransactionIds: exampleIds,
              updatedAt: new Date(),
            })
            .where(eq(schema.agentCoachingInsights.id, existing.id))
            .returning();
        });
        generatedInsights.push(updated);
      } else {
        // Create new insight
        const description = `Agent has ${data.count} findings in the "${category}" category across ${data.transactionIds.size} transaction(s). Review and coaching recommended.`;

        const [created] = await withTenantContext(tenantId, async (tx) => {
          return tx.insert(schema.agentCoachingInsights).values({
            tenantId,
            agentUserId,
            insightType: 'recurring_issue',
            category,
            description,
            occurrenceCount: data.count,
            lastOccurrence: new Date(),
            exampleTransactionIds: exampleIds,
          }).returning();
        });
        generatedInsights.push(created);
      }
    }

    logAudit({
      tenantId,
      userId,
      action: 'ai_review.coaching_generated',
      resourceType: 'agent_coaching_insight',
      details: { agentUserId, insightCount: generatedInsights.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: generatedInsights });
  } catch (err) {
    console.error('Generate coaching insights error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate coaching insights' } });
  }
});

// ─── POST /feedback — Submit AI review feedback ─────────────────────

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;

    if (!hasMinRole(role, 'managing_broker')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }

    const { findingId, feedbackType, adjustedSeverity, notes } = req.body;

    if (!findingId || !feedbackType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'findingId and feedbackType are required' } });
    }

    const validFeedbackTypes = ['false_positive', 'severity_adjustment', 'promoted_to_rule', 'confirmed', 'other'];
    if (!validFeedbackTypes.includes(feedbackType)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `feedbackType must be one of: ${validFeedbackTypes.join(', ')}` } });
    }

    // Verify finding exists
    const [finding] = await withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(schema.reviewFindings)
        .where(and(
          eq(schema.reviewFindings.id, findingId),
          eq(schema.reviewFindings.tenantId, tenantId),
        ));
    });

    if (!finding) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Finding not found' } });
    }

    const [feedback] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.aiReviewFeedback).values({
        tenantId,
        findingId,
        reviewerId: userId,
        feedbackType,
        originalSeverity: finding.severity,
        adjustedSeverity: adjustedSeverity || null,
        notes: notes || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'ai_review.feedback',
      resourceType: 'ai_review_feedback',
      resourceId: feedback.id,
      details: { findingId, feedbackType, adjustedSeverity },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: feedback });
  } catch (err) {
    console.error('Submit AI feedback error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit AI review feedback' } });
  }
});

export default router;
