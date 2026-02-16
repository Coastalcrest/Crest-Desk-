import { Router, Request, Response } from 'express';
import { eq, and, or, isNull, desc, asc, sql, ilike } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/ai-assist/conversations — List assist conversations ---------- //
router.get('/conversations', async (req: Request, res: Response) => {
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
          eq(schema.aiConversations.source, 'assist'),
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
          eq(schema.aiConversations.source, 'assist'),
          isNull(schema.aiConversations.deletedAt),
        ));

      return [rows, countResult];
    });

    return res.json({
      data: conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List assist conversations error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list conversations' } });
  }
});

// ---------- POST /api/v1/ai-assist/conversations — Start help conversation ---------- //
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { message, contextPage, contextMetadata } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'message is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Create conversation
      const [conversation] = await tx.insert(schema.aiConversations).values({
        tenantId,
        userId,
        source: 'assist',
        title: message.substring(0, 100),
        contextPage: contextPage || null,
        contextMetadata: contextMetadata || {},
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

      // Search help articles for relevant content
      const keywords = message.trim().split(/\s+/).filter((w: string) => w.length > 3);
      let responseContent = 'Thank you for your question! Let me see if I can help.';
      const matchedArticles: Array<{ id: string; title: string; slug: string }> = [];

      if (keywords.length > 0) {
        const searchConditions = keywords.map((kw: string) =>
          or(
            ilike(schema.helpArticles.title, `%${kw}%`),
            ilike(schema.helpArticles.content, `%${kw}%`),
            sql`${schema.helpArticles.tags}::text ILIKE ${'%' + kw + '%'}`,
          ),
        );

        const articles = await tx.select({
          id: schema.helpArticles.id,
          title: schema.helpArticles.title,
          slug: schema.helpArticles.slug,
          summary: schema.helpArticles.summary,
        }).from(schema.helpArticles)
          .where(and(
            eq(schema.helpArticles.isPublished, true),
            isNull(schema.helpArticles.deletedAt),
            or(...searchConditions),
          ))
          .limit(3);

        if (articles.length > 0) {
          const articleLinks = articles.map((a) => `- **${a.title}**: ${a.summary || 'See article for details.'}`);
          responseContent = `I found some help articles that may answer your question:\n\n${articleLinks.join('\n')}\n\nWould you like more details on any of these topics?`;
          matchedArticles.push(...articles.map((a) => ({ id: a.id, title: a.title, slug: a.slug })));
        } else {
          responseContent = 'I could not find a specific help article for your question. Could you provide more details? If this continues, I can escalate this to a support ticket for you.';
        }
      }

      // Insert assistant message
      const [aiMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: responseContent,
        contentType: 'text',
        metadata: { matchedArticles },
      }).returning();

      return { conversation, userMessage: userMsg, aiMessage: aiMsg };
    });

    logAudit({
      tenantId,
      userId,
      action: 'assist.conversation.create',
      resourceType: 'ai_conversation',
      resourceId: result.conversation.id,
      details: { contextPage },
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
    console.error('Create assist conversation error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start conversation' } });
  }
});

// ---------- GET /api/v1/ai-assist/conversations/:id — Get conversation with messages ---------- //
router.get('/conversations/:id', async (req: Request, res: Response) => {
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
    console.error('Get assist conversation error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get conversation' } });
  }
});

// ---------- POST /api/v1/ai-assist/conversations/:id/messages — Send help question ---------- //
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
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

      // Search for matching help articles
      const keywords = message.trim().split(/\s+/).filter((w: string) => w.length > 3);
      let responseContent = 'Let me look into that for you.';
      const matchedArticles: Array<{ id: string; title: string; slug: string }> = [];

      if (keywords.length > 0) {
        const searchConditions = keywords.map((kw: string) =>
          or(
            ilike(schema.helpArticles.title, `%${kw}%`),
            ilike(schema.helpArticles.content, `%${kw}%`),
            sql`${schema.helpArticles.tags}::text ILIKE ${'%' + kw + '%'}`,
          ),
        );

        const articles = await tx.select({
          id: schema.helpArticles.id,
          title: schema.helpArticles.title,
          slug: schema.helpArticles.slug,
          summary: schema.helpArticles.summary,
          content: schema.helpArticles.content,
        }).from(schema.helpArticles)
          .where(and(
            eq(schema.helpArticles.isPublished, true),
            isNull(schema.helpArticles.deletedAt),
            or(...searchConditions),
          ))
          .limit(3);

        if (articles.length > 0) {
          const articleSummaries = articles.map((a) => `**${a.title}**\n${a.summary || a.content.substring(0, 200)}`);
          responseContent = `Here is what I found:\n\n${articleSummaries.join('\n\n')}\n\nDoes this help? Let me know if you need more information.`;
          matchedArticles.push(...articles.map((a) => ({ id: a.id, title: a.title, slug: a.slug })));
        } else {
          responseContent = 'I was not able to find a matching help article for that question.';
        }
      }

      // Check if we should suggest escalation (after 3+ messages with no matches)
      const currentMessageCount = (conversation.messageCount || 0) + 2;
      if (matchedArticles.length === 0 && currentMessageCount >= 6) {
        responseContent += '\n\nIt seems I have not been able to fully address your question. Would you like me to escalate this to a support ticket? You can use the escalate option to connect with our support team.';
      }

      // Insert assistant message
      const [aiMsg] = await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: id,
        role: 'assistant',
        content: responseContent,
        contentType: 'text',
        metadata: { matchedArticles },
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
      action: 'assist.message.send',
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
    console.error('Send assist message error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
  }
});

// ---------- POST /api/v1/ai-assist/conversations/:id/escalate — Escalate to support ticket ---------- //
router.post('/conversations/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { subject, description } = req.body;

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

      if (!conversation) return { error: 'NOT_FOUND' };

      // Generate ticket number
      const [{ count: ticketCount }] = await tx.select({ count: sql<number>`count(*)::int` })
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.tenantId, tenantId));

      const ticketNumber = `SUP-${String(ticketCount + 1).padStart(6, '0')}`;

      // Create support ticket
      const [ticket] = await tx.insert(schema.supportTickets).values({
        tenantId,
        userId,
        conversationId: id,
        ticketNumber,
        subject: subject || conversation.title || 'Escalated from CrestAssist',
        description: description || `Escalated from help conversation: ${conversation.title}`,
        category: 'help_escalation',
        priority: 'medium',
        status: 'open',
        contextPage: conversation.contextPage,
        contextMetadata: conversation.contextMetadata,
      }).returning();

      // Update conversation status to escalated
      await tx.update(schema.aiConversations)
        .set({ status: 'escalated', updatedAt: new Date() })
        .where(eq(schema.aiConversations.id, id));

      // Add system message to conversation
      await tx.insert(schema.aiMessages).values({
        tenantId,
        conversationId: id,
        role: 'assistant',
        content: `This conversation has been escalated to support ticket ${ticketNumber}. Our team will review your question and respond shortly.`,
        contentType: 'text',
        metadata: { ticketId: ticket.id, ticketNumber },
      });

      await tx.update(schema.aiConversations)
        .set({
          messageCount: sql`${schema.aiConversations.messageCount} + 1`,
          lastMessageAt: new Date(),
        })
        .where(eq(schema.aiConversations.id, id));

      return { ticket };
    });

    if ('error' in result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'assist.conversation.escalate',
      resourceType: 'support_ticket',
      resourceId: result.ticket.id,
      details: { conversationId: id, ticketNumber: result.ticket.ticketNumber },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({ data: result.ticket });
  } catch (err) {
    console.error('Escalate conversation error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to escalate conversation' } });
  }
});

// ---------- GET /api/v1/ai-assist/articles — List help articles ---------- //
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const category = req.query.category as string;
    const featureArea = req.query.featureArea as string;
    const role = req.query.role as string;
    const state = req.query.state as string;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.helpArticles.isPublished, true),
      isNull(schema.helpArticles.deletedAt),
    ];

    // Help articles may be global (tenantId null) or tenant-specific
    if (category) {
      conditions.push(eq(schema.helpArticles.category, category));
    }
    if (featureArea) {
      conditions.push(eq(schema.helpArticles.featureArea, featureArea));
    }
    if (role) {
      conditions.push(sql`${schema.helpArticles.applicableRoles}::jsonb @> ${JSON.stringify([role])}::jsonb`);
    }
    if (state) {
      conditions.push(sql`${schema.helpArticles.applicableStates}::jsonb @> ${JSON.stringify([state])}::jsonb`);
    }

    const [articles, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select({
        id: schema.helpArticles.id,
        slug: schema.helpArticles.slug,
        title: schema.helpArticles.title,
        summary: schema.helpArticles.summary,
        category: schema.helpArticles.category,
        subcategory: schema.helpArticles.subcategory,
        featureArea: schema.helpArticles.featureArea,
        applicableRoles: schema.helpArticles.applicableRoles,
        applicableStates: schema.helpArticles.applicableStates,
        tags: schema.helpArticles.tags,
        sortOrder: schema.helpArticles.sortOrder,
        viewCount: schema.helpArticles.viewCount,
        helpfulCount: schema.helpArticles.helpfulCount,
        notHelpfulCount: schema.helpArticles.notHelpfulCount,
        createdAt: schema.helpArticles.createdAt,
        updatedAt: schema.helpArticles.updatedAt,
      }).from(schema.helpArticles)
        .where(and(...conditions))
        .orderBy(asc(schema.helpArticles.sortOrder), desc(schema.helpArticles.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.helpArticles)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List help articles error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list articles' } });
  }
});

// ---------- GET /api/v1/ai-assist/articles/search — Search articles ---------- //
router.get('/articles/search', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const q = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' } });
    }

    const articles = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.helpArticles.id,
        slug: schema.helpArticles.slug,
        title: schema.helpArticles.title,
        summary: schema.helpArticles.summary,
        category: schema.helpArticles.category,
        featureArea: schema.helpArticles.featureArea,
        tags: schema.helpArticles.tags,
        viewCount: schema.helpArticles.viewCount,
        helpfulCount: schema.helpArticles.helpfulCount,
      }).from(schema.helpArticles)
        .where(and(
          eq(schema.helpArticles.isPublished, true),
          isNull(schema.helpArticles.deletedAt),
          or(
            ilike(schema.helpArticles.title, `%${q}%`),
            ilike(schema.helpArticles.content, `%${q}%`),
            sql`${schema.helpArticles.tags}::text ILIKE ${'%' + q + '%'}`,
          ),
        ))
        .orderBy(desc(schema.helpArticles.viewCount))
        .limit(limit);
    });

    return res.json({ data: articles, total: articles.length });
  } catch (err) {
    console.error('Search articles error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search articles' } });
  }
});

// ---------- GET /api/v1/ai-assist/articles/:slug — Get article by slug ---------- //
router.get('/articles/:slug', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { slug } = req.params;

    const article = await withTenantContext(tenantId, async (tx) => {
      const [found] = await tx.select()
        .from(schema.helpArticles)
        .where(and(
          eq(schema.helpArticles.slug, slug),
          eq(schema.helpArticles.isPublished, true),
          isNull(schema.helpArticles.deletedAt),
        ));

      if (!found) return null;

      // Increment view count
      await tx.update(schema.helpArticles)
        .set({
          viewCount: sql`${schema.helpArticles.viewCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.helpArticles.id, found.id));

      return { ...found, viewCount: (found.viewCount || 0) + 1 };
    });

    if (!article) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Article not found' } });
    }

    return res.json({ data: article });
  } catch (err) {
    console.error('Get article error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get article' } });
  }
});

// ---------- POST /api/v1/ai-assist/articles/:slug/feedback — Vote helpful/not helpful ---------- //
router.post('/articles/:slug/feedback', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { slug } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'helpful must be a boolean' } });
    }

    const article = await withTenantContext(tenantId, async (tx) => {
      const [found] = await tx.select({ id: schema.helpArticles.id })
        .from(schema.helpArticles)
        .where(and(
          eq(schema.helpArticles.slug, slug),
          eq(schema.helpArticles.isPublished, true),
          isNull(schema.helpArticles.deletedAt),
        ));

      if (!found) return null;

      const updateField = helpful
        ? { helpfulCount: sql`${schema.helpArticles.helpfulCount} + 1` }
        : { notHelpfulCount: sql`${schema.helpArticles.notHelpfulCount} + 1` };

      const [updated] = await tx.update(schema.helpArticles)
        .set({ ...updateField, updatedAt: new Date() })
        .where(eq(schema.helpArticles.id, found.id))
        .returning();

      return updated;
    });

    if (!article) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Article not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'assist.article.feedback',
      resourceType: 'help_article',
      resourceId: article.id,
      details: { slug, helpful },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: article });
  } catch (err) {
    console.error('Article feedback error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit feedback' } });
  }
});

// ---------- GET /api/v1/ai-assist/context-help — Contextual help by page ---------- //
router.get('/context-help', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = req.query.page as string;

    if (!page || page.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'page query parameter is required' } });
    }

    // Extract feature area from page path (e.g., "/transactions/123" -> "transactions")
    const pathSegments = page.replace(/^\//, '').split('/');
    const featureArea = pathSegments[0];

    const articles = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.helpArticles.id,
        slug: schema.helpArticles.slug,
        title: schema.helpArticles.title,
        summary: schema.helpArticles.summary,
        category: schema.helpArticles.category,
        featureArea: schema.helpArticles.featureArea,
      }).from(schema.helpArticles)
        .where(and(
          eq(schema.helpArticles.isPublished, true),
          isNull(schema.helpArticles.deletedAt),
          eq(schema.helpArticles.featureArea, featureArea),
        ))
        .orderBy(asc(schema.helpArticles.sortOrder))
        .limit(10);
    });

    return res.json({ data: articles, total: articles.length });
  } catch (err) {
    console.error('Context help error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get contextual help' } });
  }
});

export default router;
