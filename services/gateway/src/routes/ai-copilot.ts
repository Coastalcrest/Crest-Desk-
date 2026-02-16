import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql, lte, gte } from 'drizzle-orm';
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

// ---------- Helper: generate AI response based on message keywords ---------- //
async function generateAiResponse(
  tx: typeof db,
  tenantId: string,
  userId: string,
  userRole: string,
  message: string,
): Promise<{ content: string; metadata: Record<string, unknown> }> {
  const lowerMessage = message.toLowerCase();

  // Status / deal queries
  if (lowerMessage.includes('status') || lowerMessage.includes('deal')) {
    const ownerConditions = hasMinRole(userRole, 'managing_broker')
      ? [eq(schema.deals.tenantId, tenantId), isNull(schema.deals.deletedAt)]
      : [eq(schema.deals.tenantId, tenantId), eq(schema.deals.ownerUserId, userId), isNull(schema.deals.deletedAt)];

    const deals = await tx.select({
      id: schema.deals.id,
      dealName: schema.deals.dealName,
      dealValue: schema.deals.dealValue,
      expectedCloseDate: schema.deals.expectedCloseDate,
      probability: schema.deals.probability,
    }).from(schema.deals)
      .where(and(...ownerConditions))
      .orderBy(desc(schema.deals.createdAt))
      .limit(10);

    if (deals.length === 0) {
      return { content: 'You have no active deals at the moment. Create a deal from the CRM to get started.', metadata: { queryType: 'deal_status', resultCount: 0 } };
    }

    const lines = deals.map((d) => `- ${d.dealName}: $${d.dealValue || '0'} (${d.probability}% probability, close: ${d.expectedCloseDate || 'TBD'})`);
    return {
      content: `Here are your active deals:\n\n${lines.join('\n')}\n\nTotal: ${deals.length} deal(s). Would you like details on a specific deal?`,
      metadata: { queryType: 'deal_status', resultCount: deals.length },
    };
  }

  // Deadline / closing / contingency queries
  if (lowerMessage.includes('deadline') || lowerMessage.includes('closing') || lowerMessage.includes('contingency')) {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const today = new Date().toISOString().split('T')[0];

    const upcoming = await tx.select({
      id: schema.transactions.id,
      propertyAddress: schema.transactions.propertyAddress,
      closingDate: schema.transactions.closingDate,
      status: schema.transactions.status,
      buyerName: schema.transactions.buyerName,
      sellerName: schema.transactions.sellerName,
    }).from(schema.transactions)
      .where(and(
        eq(schema.transactions.tenantId, tenantId),
        isNull(schema.transactions.deletedAt),
        sql`${schema.transactions.closingDate} >= ${today}`,
        sql`${schema.transactions.closingDate} <= ${thirtyDaysOut.toISOString().split('T')[0]}`,
      ))
      .orderBy(asc(schema.transactions.closingDate))
      .limit(15);

    if (upcoming.length === 0) {
      return { content: 'No upcoming deadlines in the next 30 days. All clear!', metadata: { queryType: 'deadlines', resultCount: 0 } };
    }

    const lines = upcoming.map((t) => `- ${t.propertyAddress}: closing ${t.closingDate} (${t.status})`);
    return {
      content: `Upcoming deadlines (next 30 days):\n\n${lines.join('\n')}\n\n${upcoming.length} transaction(s) approaching closing.`,
      metadata: { queryType: 'deadlines', resultCount: upcoming.length },
    };
  }

  // Missing document queries
  if (lowerMessage.includes('missing') || lowerMessage.includes('document')) {
    const transactions = await tx.select({
      id: schema.transactions.id,
      propertyAddress: schema.transactions.propertyAddress,
    }).from(schema.transactions)
      .where(and(
        eq(schema.transactions.tenantId, tenantId),
        isNull(schema.transactions.deletedAt),
        eq(schema.transactions.status, 'active'),
      ))
      .limit(10);

    const summaries: string[] = [];
    for (const txn of transactions) {
      const [{ count: docCount }] = await tx.select({ count: sql<number>`count(*)::int` })
        .from(schema.documents)
        .where(and(
          eq(schema.documents.tenantId, tenantId),
          eq(schema.documents.transactionId, txn.id),
          isNull(schema.documents.deletedAt),
        ));

      if (docCount < 3) {
        summaries.push(`- ${txn.propertyAddress}: only ${docCount} document(s) uploaded`);
      }
    }

    if (summaries.length === 0) {
      return { content: 'All active transactions appear to have documents uploaded. Review individual transactions for specific requirements.', metadata: { queryType: 'missing_documents', resultCount: 0 } };
    }

    return {
      content: `Transactions that may be missing documents:\n\n${summaries.join('\n')}\n\nReview these transactions to ensure all required documents are uploaded.`,
      metadata: { queryType: 'missing_documents', resultCount: summaries.length },
    };
  }

  // Compliance queries
  if (lowerMessage.includes('compliance')) {
    const checklists = await tx.select({
      id: schema.complianceChecklists.id,
      transactionId: schema.complianceChecklists.transactionId,
      jurisdiction: schema.complianceChecklists.jurisdiction,
      status: schema.complianceChecklists.status,
      federalItemsComplete: schema.complianceChecklists.federalItemsComplete,
      stateItemsComplete: schema.complianceChecklists.stateItemsComplete,
    }).from(schema.complianceChecklists)
      .where(and(
        eq(schema.complianceChecklists.tenantId, tenantId),
        eq(schema.complianceChecklists.status, 'in_progress'),
      ))
      .limit(10);

    if (checklists.length === 0) {
      return { content: 'All compliance checklists are complete. Great work!', metadata: { queryType: 'compliance', resultCount: 0 } };
    }

    const lines = checklists.map((c) => `- Transaction ${c.transactionId}: ${c.jurisdiction} - Federal: ${c.federalItemsComplete ? 'Complete' : 'Incomplete'}, State: ${c.stateItemsComplete ? 'Complete' : 'Incomplete'}`);
    return {
      content: `In-progress compliance checklists:\n\n${lines.join('\n')}\n\n${checklists.length} checklist(s) need attention.`,
      metadata: { queryType: 'compliance', resultCount: checklists.length },
    };
  }

  // Default response
  return {
    content: 'I can help with deal status, deadlines, missing documents, and compliance. Try asking about a specific deal or "What are my upcoming deadlines?"',
    metadata: { queryType: 'default' },
  };
}

// ---------- GET /api/v1/ai-copilot — List copilot conversations ---------- //
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;

    const [conversations, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select()
        .from(schema.aiConversations)
        .where(and(
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          eq(schema.aiConversations.source, 'copilot'),
          isNull(schema.aiConversations.deletedAt),
        ))
        .orderBy(desc(schema.aiConversations.lastMessageAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.aiConversations)
        .where(and(
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          eq(schema.aiConversations.source, 'copilot'),
          isNull(schema.aiConversations.deletedAt),
        ));

      return [rows, countResult];
    });

    return res.json({
      data: conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List copilot conversations error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list conversations' } });
  }
});

// ---------- POST /api/v1/ai-copilot — Start new conversation ---------- //
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { message, contextType, contextId, title } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'message is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Create conversation
      const [conversation] = await tx.insert(schema.aiConversations).values({
        tenantId,
        userId,
        source: 'copilot',
        title: title || message.substring(0, 100),
        contextType: contextType || null,
        contextId: contextId || null,
        status: 'active',
        messageCount: 2,
        lastMessageAt: new Date(),
      }).returning();

      // Insert user message
      const [userMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: conversation.id,
        role: 'user',
        content: message.trim(),
        contentType: 'text',
        metadata: {},
      }).returning();

      // Generate AI response
      const aiResponse = await generateAiResponse(tx, tenantId, userId, role, message);

      // Insert AI message
      const [aiMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        contentType: 'text',
        metadata: aiResponse.metadata,
      }).returning();

      return { conversation, userMessage: userMsg, aiMessage: aiMsg };
    });

    logAudit({
      tenantId,
      userId,
      action: 'copilot.conversation.create',
      resourceType: 'ai_conversation',
      resourceId: result.conversation.id,
      details: { contextType, contextId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      data: {
        conversation: result.conversation,
        messages: [result.userMessage, result.aiMessage],
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create copilot conversation error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start conversation' } });
  }
});

// ---------- GET /api/v1/ai-copilot/:id — Get conversation with messages ---------- //
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [conversation] = await tx.select()
        .from(schema.aiConversations)
        .where(and(
          eq(schema.aiConversations.id, id),
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          isNull(schema.aiConversations.deletedAt),
        ));

      if (!conversation) return null;

      const messages = await tx.select()
        .from(schema.aiMessages)
        .where(eq(schema.aiMessages.conversationId, id))
        .orderBy(asc(schema.aiMessages.createdAt));

      return { ...conversation, messages };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get copilot conversation error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get conversation' } });
  }
});

// ---------- POST /api/v1/ai-copilot/:id/messages — Send message ---------- //
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'message is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify conversation exists and belongs to user
      const [conversation] = await tx.select()
        .from(schema.aiConversations)
        .where(and(
          eq(schema.aiConversations.id, id),
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          isNull(schema.aiConversations.deletedAt),
        ));

      if (!conversation) return null;

      // Insert user message
      const [userMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: id,
        role: 'user',
        content: message.trim(),
        contentType: 'text',
        metadata: {},
      }).returning();

      // Generate AI response
      const aiResponse = await generateAiResponse(tx, tenantId, userId, role, message);

      // Insert AI message
      const [aiMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: id,
        role: 'assistant',
        content: aiResponse.content,
        contentType: 'text',
        metadata: aiResponse.metadata,
      }).returning();

      // Update conversation
      await tx.update(schema.aiConversations)
        .set({
          messageCount: sql`${schema.aiConversations.messageCount} + 2`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.aiConversations.id, id));

      return { userMessage: userMsg, aiMessage: aiMsg };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'copilot.message.send',
      resourceType: 'ai_conversation',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      data: { userMessage: result.userMessage, aiMessage: result.aiMessage },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Send copilot message error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
  }
});

// ---------- DELETE /api/v1/ai-copilot/:id — Soft delete conversation ---------- //
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [conversation] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.aiConversations)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.aiConversations.id, id),
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          isNull(schema.aiConversations.deletedAt),
        ))
        .returning();
    });

    if (!conversation) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'copilot.conversation.delete',
      resourceType: 'ai_conversation',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(204).send();
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete copilot conversation error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete conversation' } });
  }
});

// ---------- POST /api/v1/ai-copilot/query — One-shot query (no conversation saved) ---------- //
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;
    const { query, contextType, contextId } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'query is required' } });
    }

    const response = await withTenantContext(tenantId, async (tx) => {
      return generateAiResponse(tx, tenantId, userId, role, query);
    });

    logAudit({
      tenantId,
      userId,
      action: 'copilot.query',
      resourceType: 'ai_query',
      details: { contextType, contextId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      data: {
        response: response.content,
        metadata: response.metadata,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Copilot query error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process query' } });
  }
});

// ---------- GET /api/v1/ai-copilot/deals/overview — Cross-deal overview ---------- //
router.get('/deals/overview', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;

    const ownerConditions = hasMinRole(role, 'managing_broker')
      ? [eq(schema.deals.tenantId, tenantId), isNull(schema.deals.deletedAt)]
      : [eq(schema.deals.tenantId, tenantId), eq(schema.deals.ownerUserId, userId), isNull(schema.deals.deletedAt)];

    const overview = await withTenantContext(tenantId, async (tx) => {
      const deals = await tx.select({
        id: schema.deals.id,
        dealName: schema.deals.dealName,
        dealValue: schema.deals.dealValue,
        expectedCloseDate: schema.deals.expectedCloseDate,
        probability: schema.deals.probability,
        dealType: schema.deals.dealType,
        propertyAddress: schema.deals.propertyAddress,
        transactionId: schema.deals.transactionId,
        ownerUserId: schema.deals.ownerUserId,
        wonAt: schema.deals.wonAt,
        lostAt: schema.deals.lostAt,
        createdAt: schema.deals.createdAt,
        stageName: schema.pipelineStages.stageName,
        stageColor: schema.pipelineStages.stageColor,
        contactFirstName: schema.contacts.firstName,
        contactLastName: schema.contacts.lastName,
      }).from(schema.deals)
        .leftJoin(schema.pipelineStages, eq(schema.deals.pipelineStageId, schema.pipelineStages.id))
        .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
        .where(and(...ownerConditions))
        .orderBy(asc(schema.deals.expectedCloseDate));

      // Get document counts per deal's transaction
      const dealsWithDocs = [];
      for (const deal of deals) {
        let documentCount = 0;
        if (deal.transactionId) {
          const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
            .from(schema.documents)
            .where(and(
              eq(schema.documents.tenantId, tenantId),
              eq(schema.documents.transactionId, deal.transactionId),
              isNull(schema.documents.deletedAt),
            ));
          documentCount = count;
        }
        dealsWithDocs.push({ ...deal, documentCount });
      }

      return dealsWithDocs;
    });

    return res.json({ data: overview, total: overview.length });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Deals overview error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get deals overview' } });
  }
});

// ---------- GET /api/v1/ai-copilot/deals/:dealId/summary — Single deal summary ---------- //
router.get('/deals/:dealId/summary', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { dealId } = req.params;

    const summary = await withTenantContext(tenantId, async (tx) => {
      const [deal] = await tx.select({
        id: schema.deals.id,
        dealName: schema.deals.dealName,
        dealValue: schema.deals.dealValue,
        expectedCloseDate: schema.deals.expectedCloseDate,
        probability: schema.deals.probability,
        dealType: schema.deals.dealType,
        propertyAddress: schema.deals.propertyAddress,
        propertyState: schema.deals.propertyState,
        transactionId: schema.deals.transactionId,
        ownerUserId: schema.deals.ownerUserId,
        notes: schema.deals.notes,
        wonAt: schema.deals.wonAt,
        lostAt: schema.deals.lostAt,
        createdAt: schema.deals.createdAt,
        stageName: schema.pipelineStages.stageName,
        contactFirstName: schema.contacts.firstName,
        contactLastName: schema.contacts.lastName,
        contactEmail: schema.contacts.email,
        contactPhone: schema.contacts.phone,
      }).from(schema.deals)
        .leftJoin(schema.pipelineStages, eq(schema.deals.pipelineStageId, schema.pipelineStages.id))
        .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
        .where(and(
          eq(schema.deals.id, dealId),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (!deal) return null;

      // Get transaction details if linked
      let transaction = null;
      if (deal.transactionId) {
        const [txn] = await tx.select()
          .from(schema.transactions)
          .where(and(
            eq(schema.transactions.id, deal.transactionId),
            eq(schema.transactions.tenantId, tenantId),
            isNull(schema.transactions.deletedAt),
          ));
        transaction = txn || null;
      }

      // Get document count
      let documentCount = 0;
      if (deal.transactionId) {
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` })
          .from(schema.documents)
          .where(and(
            eq(schema.documents.tenantId, tenantId),
            eq(schema.documents.transactionId, deal.transactionId),
            isNull(schema.documents.deletedAt),
          ));
        documentCount = count;
      }

      // Get compliance checklist status
      let complianceStatus = null;
      if (deal.transactionId) {
        const [checklist] = await tx.select()
          .from(schema.complianceChecklists)
          .where(eq(schema.complianceChecklists.transactionId, deal.transactionId));
        complianceStatus = checklist || null;
      }

      // Build AI summary
      const summaryParts: string[] = [];
      summaryParts.push(`Deal "${deal.dealName}" is currently in the ${deal.stageName || 'Unknown'} stage.`);
      if (deal.dealValue) {
        summaryParts.push(`Value: $${deal.dealValue}.`);
      }
      if (deal.expectedCloseDate) {
        summaryParts.push(`Expected close: ${deal.expectedCloseDate}.`);
      }
      if (transaction) {
        summaryParts.push(`Linked transaction: ${transaction.propertyAddress} (${transaction.status}).`);
      }
      summaryParts.push(`Documents: ${documentCount} uploaded.`);
      if (complianceStatus) {
        summaryParts.push(`Compliance: ${complianceStatus.status} (Federal: ${complianceStatus.federalItemsComplete ? 'Complete' : 'Incomplete'}, State: ${complianceStatus.stateItemsComplete ? 'Complete' : 'Incomplete'}).`);
      }

      return {
        deal,
        transaction,
        documentCount,
        complianceStatus,
        aiSummary: summaryParts.join(' '),
      };
    });

    if (!summary) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    }

    return res.json({ data: summary });
  } catch (err) {
    logger.error({ err, tenantId }, 'Deal summary error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get deal summary' } });
  }
});

// ---------- GET /api/v1/ai-copilot/deadlines — Upcoming deadlines ---------- //
router.get('/deadlines', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const thirtyDaysStr = thirtyDaysOut.toISOString().split('T')[0];

    const deadlines = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.transactions.id,
        propertyAddress: schema.transactions.propertyAddress,
        propertyState: schema.transactions.propertyState,
        closingDate: schema.transactions.closingDate,
        status: schema.transactions.status,
        transactionType: schema.transactions.transactionType,
        buyerName: schema.transactions.buyerName,
        sellerName: schema.transactions.sellerName,
        purchasePrice: schema.transactions.purchasePrice,
      }).from(schema.transactions)
        .where(and(
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
          sql`${schema.transactions.closingDate} >= ${today}`,
          sql`${schema.transactions.closingDate} <= ${thirtyDaysStr}`,
        ))
        .orderBy(asc(schema.transactions.closingDate));
    });

    return res.json({ data: deadlines, total: deadlines.length });
  } catch (err) {
    logger.error({ err, tenantId }, 'Upcoming deadlines error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get deadlines' } });
  }
});

// ---------- GET /api/v1/ai-copilot/alerts — Proactive alerts ---------- //
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, role } = req.user!;

    const alerts = await withTenantContext(tenantId, async (tx) => {
      const alertItems: Array<{ type: string; severity: string; message: string; resourceType: string; resourceId: string }> = [];

      // 1. Upcoming deadlines (within 7 days)
      const sevenDaysOut = new Date();
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const today = new Date().toISOString().split('T')[0];

      const urgentClosings = await tx.select({
        id: schema.transactions.id,
        propertyAddress: schema.transactions.propertyAddress,
        closingDate: schema.transactions.closingDate,
      }).from(schema.transactions)
        .where(and(
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
          sql`${schema.transactions.closingDate} >= ${today}`,
          sql`${schema.transactions.closingDate} <= ${sevenDaysOut.toISOString().split('T')[0]}`,
        ))
        .orderBy(asc(schema.transactions.closingDate));

      for (const txn of urgentClosings) {
        alertItems.push({
          type: 'deadline',
          severity: 'warning',
          message: `Closing in 7 days or less: ${txn.propertyAddress} (${txn.closingDate})`,
          resourceType: 'transaction',
          resourceId: txn.id,
        });
      }

      // 2. Incomplete compliance checklists
      const incompleteChecklists = await tx.select({
        id: schema.complianceChecklists.id,
        transactionId: schema.complianceChecklists.transactionId,
        jurisdiction: schema.complianceChecklists.jurisdiction,
        federalItemsComplete: schema.complianceChecklists.federalItemsComplete,
        stateItemsComplete: schema.complianceChecklists.stateItemsComplete,
      }).from(schema.complianceChecklists)
        .where(and(
          eq(schema.complianceChecklists.tenantId, tenantId),
          eq(schema.complianceChecklists.status, 'in_progress'),
        ))
        .limit(20);

      for (const cl of incompleteChecklists) {
        const issues: string[] = [];
        if (!cl.federalItemsComplete) issues.push('federal');
        if (!cl.stateItemsComplete) issues.push('state');
        if (issues.length > 0) {
          alertItems.push({
            type: 'compliance',
            severity: 'warning',
            message: `Compliance incomplete (${issues.join(', ')} items) for transaction ${cl.transactionId}`,
            resourceType: 'compliance_checklist',
            resourceId: cl.id,
          });
        }
      }

      // 3. Transactions with very few documents
      const activeTransactions = await tx.select({
        id: schema.transactions.id,
        propertyAddress: schema.transactions.propertyAddress,
      }).from(schema.transactions)
        .where(and(
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
          eq(schema.transactions.status, 'active'),
        ))
        .limit(20);

      for (const txn of activeTransactions) {
        const [{ count: docCount }] = await tx.select({ count: sql<number>`count(*)::int` })
          .from(schema.documents)
          .where(and(
            eq(schema.documents.tenantId, tenantId),
            eq(schema.documents.transactionId, txn.id),
            isNull(schema.documents.deletedAt),
          ));

        if (docCount === 0) {
          alertItems.push({
            type: 'missing_documents',
            severity: 'info',
            message: `No documents uploaded for: ${txn.propertyAddress}`,
            resourceType: 'transaction',
            resourceId: txn.id,
          });
        }
      }

      return alertItems;
    });

    return res.json({ data: alerts, total: alerts.length });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Proactive alerts error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get alerts' } });
  }
});

// ---------- POST /api/v1/ai-copilot/:id/feedback — Rate message ---------- //
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { messageId, rating, comment } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'messageId is required' } });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'rating must be a number between 1 and 5' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify conversation belongs to user
      const [conversation] = await tx.select({ id: schema.aiConversations.id })
        .from(schema.aiConversations)
        .where(and(
          eq(schema.aiConversations.id, id),
          eq(schema.aiConversations.tenantId, tenantId),
          eq(schema.aiConversations.userId, userId),
          isNull(schema.aiConversations.deletedAt),
        ));

      if (!conversation) return { error: 'CONVERSATION_NOT_FOUND' };

      // Verify message belongs to conversation
      const [msg] = await tx.select({ id: schema.aiMessages.id })
        .from(schema.aiMessages)
        .where(and(
          eq(schema.aiMessages.id, messageId),
          eq(schema.aiMessages.conversationId, id),
        ));

      if (!msg) return { error: 'MESSAGE_NOT_FOUND' };

      // Update message with feedback
      const [updated] = await tx.update(schema.aiMessages)
        .set({
          feedbackRating: rating,
          feedbackComment: comment || null,
        })
        .where(eq(schema.aiMessages.id, messageId))
        .returning();

      return { message: updated };
    });

    if ('error' in result) {
      if (result.error === 'CONVERSATION_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
      }
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'copilot.message.feedback',
      resourceType: 'ai_message',
      resourceId: messageId,
      details: { rating, comment },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: result.message });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Message feedback error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit feedback' } });
  }
});

export default router;
