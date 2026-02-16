import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { validateBody, validateQuery } from '../middleware/validate';
import { logger } from '../lib/logger';
import {
  composeEmailSchema,
  batchActionSchema,
  aiReplySchema,
  listEmailsQuery,
} from '../schemas';
import { sendData, sendPaginated, sendError } from '../lib/response';

const router = Router();
router.use(requireAuth);

// ---------- GET / --- List emails (unified inbox) ---------- //
router.get("/", validateQuery(listEmailsQuery), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { page, pageSize, folder, accountId, search, isRead, isStarred, contactId, dealId } = req.query as any;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(schema.emails.tenantId, tenantId),
      eq(schema.emails.userId, userId),
      isNull(schema.emails.deletedAt),
    ];

    if (folder) {
      if (folder === 'starred') {
        conditions.push(eq(schema.emails.isStarred, true));
      } else if (folder === 'drafts') {
        conditions.push(eq(schema.emails.isDraft, true));
      } else {
        conditions.push(eq(schema.emails.folder, folder));
      }
    }
    if (accountId) conditions.push(eq(schema.emails.accountId, accountId));
    if (isRead === true) conditions.push(eq(schema.emails.isRead, true));
    if (isRead === false) conditions.push(eq(schema.emails.isRead, false));
    if (isStarred === true) conditions.push(eq(schema.emails.isStarred, true));
    if (contactId) conditions.push(eq(schema.emails.contactId, contactId));
    if (dealId) conditions.push(eq(schema.emails.dealId, dealId));
    if (search) {
      conditions.push(sql`(${schema.emails.subject} ILIKE ${'%' + search + '%'} OR ${schema.emails.fromName} ILIKE ${'%' + search + '%'} OR ${schema.emails.fromAddress} ILIKE ${'%' + search + '%'})`);
    }

    const [emails, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.emails)
        .where(and(...conditions))
        .orderBy(desc(schema.emails.receivedAt))
        .limit(pageSize).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.emails).where(and(...conditions));
      return [rows, cr];
    });

    const total = (countRes[0]?.total as number) ?? 0;
    sendPaginated(res, emails, { page, pageSize, total });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List emails error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list emails" } });
  }
});

// ---------- GET /stats --- Inbox statistics ---------- //
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const stats = await withTenantContext(tenantId, async (tx) => {
      const [r] = await tx.select({
        totalEmails: sql<number>`count(*)::int`,
        unreadCount: sql<number>`count(*) filter (where ${schema.emails.isRead} = false)::int`,
        starredCount: sql<number>`count(*) filter (where ${schema.emails.isStarred} = true)::int`,
        draftsCount: sql<number>`count(*) filter (where ${schema.emails.isDraft} = true)::int`,
        sentCount: sql<number>`count(*) filter (where ${schema.emails.direction} = 'outbound')::int`,
        todayReceived: sql<number>`count(*) filter (where ${schema.emails.receivedAt} >= CURRENT_DATE)::int`,
      }).from(schema.emails).where(and(
        eq(schema.emails.tenantId, tenantId),
        eq(schema.emails.userId, userId),
        isNull(schema.emails.deletedAt),
      ));
      return r;
    });
    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Email stats error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get email stats" } });
  }
});

// ---------- GET /threads/:threadId --- Thread view ---------- //
router.get("/threads/:threadId", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { threadId } = req.params;
    const emails = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.emails).where(and(
        eq(schema.emails.tenantId, tenantId),
        eq(schema.emails.userId, userId),
        eq(schema.emails.threadId, threadId),
        isNull(schema.emails.deletedAt),
      )).orderBy(asc(schema.emails.receivedAt));
    });
    if (emails.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Thread not found" } });
    }
    return res.json({ data: emails });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get thread error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get email thread" } });
  }
});

// ---------- GET /:id --- Get single email ---------- //
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const email = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.emails).where(and(
        eq(schema.emails.id, id),
        eq(schema.emails.tenantId, tenantId),
        eq(schema.emails.userId, userId),
        isNull(schema.emails.deletedAt),
      ));
      return row || null;
    });
    if (!email) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email not found" } });
    }
    // Mark as read
    if (!email.isRead) {
      await withTenantContext(tenantId, async (tx) => {
        await tx.update(schema.emails).set({ isRead: true, updatedAt: new Date() })
          .where(eq(schema.emails.id, id));
      });
    }
    return res.json({ data: { ...email, isRead: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get email error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get email" } });
  }
});

// ---------- POST / --- Compose / send email ---------- //
router.post("/", validateBody(composeEmailSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, isDraft, scheduledAt, contactId, dealId, transactionId, replyToEmailId } = req.body;

    // Verify account belongs to user
    const account = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.emailAccounts).where(and(
        eq(schema.emailAccounts.id, accountId),
        eq(schema.emailAccounts.tenantId, tenantId),
        eq(schema.emailAccounts.userId, userId),
        isNull(schema.emailAccounts.deletedAt),
      ));
      return row;
    });
    if (!account) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email account not found" } });
    }
    const direction = 'outbound';
    const snippet = bodyText ? bodyText.substring(0, 200) : '';
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@crestdesk.com>`;

    const [email] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.emails).values({
        tenantId, accountId, userId, direction,
        fromAddress: account.email,
        fromName: account.displayName || account.email,
        toAddresses: to || [],
        ccAddresses: cc || [],
        bccAddresses: bcc || [],
        subject, bodyHtml, bodyText, snippet,
        messageId, inReplyTo: replyToEmailId || null,
        threadId: null,
        isDraft: isDraft || false,
        folder: isDraft ? 'drafts' : 'sent',
        isRead: true,
        contactId: contactId || null,
        dealId: dealId || null,
        transactionId: transactionId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        sentAt: isDraft ? null : new Date(),
        receivedAt: new Date(),
      }).returning();
    });

    logAudit({ tenantId, userId, action: isDraft ? "email.draft" : "email.send", resourceType: "email",
      resourceId: email.id, details: { to, subject: subject?.substring(0, 100), isDraft },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });

    return res.status(201).json({ data: email });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Compose email error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to compose email" } });
  }
});

// ---------- POST /ai-reply --- AI-generated reply ---------- //
router.post("/ai-reply", validateBody(aiReplySchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { emailId, tone } = req.body;

    const original = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.emails).where(and(
        eq(schema.emails.id, emailId),
        eq(schema.emails.tenantId, tenantId),
        eq(schema.emails.userId, userId),
      ));
      return row;
    });
    if (!original) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email not found" } });
    }
    const toneLabel = tone || 'professional';
    const replySubject = original.subject?.startsWith('Re:') ? original.subject : `Re: ${original.subject || ''}`;
    const generatedReply = `Thank you for your email regarding "${original.subject || 'your inquiry'}". I appreciate you reaching out and would be happy to assist. Let me review the details and get back to you shortly with a comprehensive response.`;
    const alternatives = [
      generatedReply,
      `Hi ${original.fromName || 'there'}, thanks for getting in touch about this. I will look into it and follow up with you soon.`,
      `I received your message about "${original.subject || 'this matter'}" and will review it carefully. You can expect a detailed response within 24 hours.`,
    ];
    logAudit({ tenantId, userId, action: "email.ai_reply", resourceType: "email",
      resourceId: emailId, details: { tone: toneLabel },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { replySubject, generatedReply, alternatives, tone: toneLabel, originalEmailId: emailId } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'AI reply error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate AI reply" } });
  }
});

// ---------- POST /ai-summarize --- AI email summarization ---------- //
router.post("/ai-summarize", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { emailIds } = req.body;
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "emailIds array is required" } });
    }
    const emails = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.emails).where(and(
        sql`${schema.emails.id} = ANY(${emailIds})`,
        eq(schema.emails.tenantId, tenantId),
        eq(schema.emails.userId, userId),
      ));
    });
    const summaries = emails.map((e) => ({
      emailId: e.id,
      summary: `Email from ${e.fromName || e.fromAddress} about "${e.subject || 'No subject'}". ${e.snippet || ''}`,
      sentiment: 'neutral',
      category: 'general',
      actionRequired: false,
    }));
    await withTenantContext(tenantId, async (tx) => {
      for (const s of summaries) {
        await tx.update(schema.emails).set({
          aiSummary: s.summary, aiSentiment: s.sentiment, aiCategory: s.category, updatedAt: new Date(),
        }).where(eq(schema.emails.id, s.emailId));
      }
    });
    return res.json({ data: { summaries, totalProcessed: summaries.length } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'AI summarize error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to summarize emails" } });
  }
});

// ---------- PATCH /:id --- Update email (star, read, move, label) ---------- //
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["isRead", "isStarred", "folder", "labels", "contactId", "dealId"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [email] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emails).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.emails.id, id), eq(schema.emails.tenantId, tenantId), eq(schema.emails.userId, userId), isNull(schema.emails.deletedAt)))
        .returning();
    });
    if (!email) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email not found" } });
    return res.json({ data: email });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update email error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update email" } });
  }
});

// ---------- POST /batch --- Batch operations ---------- //
router.post("/batch", validateBody(batchActionSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { emailIds, action } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    switch (action) {
      case 'read': updateData.isRead = true; break;
      case 'unread': updateData.isRead = false; break;
      case 'archive': updateData.folder = 'archive'; break;
      case 'trash': updateData.folder = 'trash'; break;
      case 'star': updateData.isStarred = true; break;
      case 'unstar': updateData.isStarred = false; break;
    }
    const count = await withTenantContext(tenantId, async (tx) => {
      const result = await tx.update(schema.emails).set(updateData)
        .where(and(
          sql`${schema.emails.id} = ANY(${emailIds})`,
          eq(schema.emails.tenantId, tenantId),
          eq(schema.emails.userId, userId),
          isNull(schema.emails.deletedAt),
        )).returning({ id: schema.emails.id });
      return result.length;
    });
    logAudit({ tenantId, userId, action: `email.batch_${action}`, resourceType: "email",
      details: { emailIds, action, affected: count },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { action, affected: count } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Batch email error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to batch update emails" } });
  }
});

// ---------- DELETE /:id --- Soft delete email ---------- //
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [email] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.emails).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.emails.id, id), eq(schema.emails.tenantId, tenantId), eq(schema.emails.userId, userId), isNull(schema.emails.deletedAt)))
        .returning();
    });
    if (!email) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Email not found" } });
    logAudit({ tenantId, userId, action: "email.delete", resourceType: "email",
      resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete email error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete email" } });
  }
});

export default router;
