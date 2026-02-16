import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { validateBody, validateQuery } from '../middleware/validate';
import { logger } from '../lib/logger';
import {
  createPostSchema,
  updatePostSchema,
  generatePostSchema,
  listPostsQuery,
} from '../schemas';
import { sendData, sendPaginated, sendError } from '../lib/response';

const router = Router();
router.use(requireAuth);

// ---------- GET / --- List social posts ---------- //
router.get("/", validateQuery(listPostsQuery), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { page, pageSize, agentId, platform, postType, status, transactionId, scheduledFrom, scheduledTo, sortBy } = req.query as any;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(schema.socialPosts.tenantId, tenantId),
      isNull(schema.socialPosts.deletedAt),
    ];
    if (agentId) conditions.push(eq(schema.socialPosts.agentId, agentId));
    if (platform) conditions.push(eq(schema.socialPosts.platform, platform));
    if (postType) conditions.push(eq(schema.socialPosts.postType, postType));
    if (status) conditions.push(eq(schema.socialPosts.status, status));
    if (transactionId) conditions.push(eq(schema.socialPosts.transactionId, transactionId));
    if (scheduledFrom) {
      conditions.push(sql`${schema.socialPosts.scheduledAt} >= ${scheduledFrom}::timestamptz`);
    }
    if (scheduledTo) {
      conditions.push(sql`${schema.socialPosts.scheduledAt} <= ${scheduledTo}::timestamptz`);
    }
    const orderClause = sortBy === "publishedAt" ? desc(schema.socialPosts.publishedAt)
      : sortBy === "scheduledAt" ? asc(schema.socialPosts.scheduledAt)
      : desc(schema.socialPosts.createdAt);
    const [posts, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.socialPosts)
        .where(and(...conditions)).orderBy(orderClause)
        .limit(pageSize).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.socialPosts).where(and(...conditions));
      return [rows, cr];
    });
    const total = (countRes[0]?.total as number) ?? 0;
    sendPaginated(res, posts, { page, pageSize, total });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'List social posts error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list social posts" } });
  }
});

// ---------- GET /stats --- Post statistics ---------- //
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const stats = await withTenantContext(tenantId, async (tx) => {
      const [r] = await tx.select({
        totalPosts: sql<number>`count(*)::int`,
        publishedThisMonth: sql<number>`count(*) filter (where ${schema.socialPosts.publishedAt} >= ${monthStart}::timestamptz)::int`,
        scheduledCount: sql<number>`count(*) filter (where ${schema.socialPosts.status} = $$scheduled$$)::int`,
        pendingApproval: sql<number>`count(*) filter (where ${schema.socialPosts.status} = $$pending_approval$$)::int`,
        totalImpressions: sql<number>`coalesce(sum(${schema.socialPosts.impressions}), 0)::int`,
        totalEngagement: sql<number>`coalesce(sum(${schema.socialPosts.likes}) + sum(${schema.socialPosts.comments}) + sum(${schema.socialPosts.shares}), 0)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        isNull(schema.socialPosts.deletedAt),
      ));
      // Find top platform
      const platformStats = await tx.select({
        platform: schema.socialPosts.platform,
        count: sql<number>`count(*)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        isNull(schema.socialPosts.deletedAt),
      )).groupBy(schema.socialPosts.platform).orderBy(desc(sql`count(*)`)).limit(1);
      const topPlatform = platformStats[0]?.platform || null;
      return { ...r, topPlatform };
    });
    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Post stats error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get post stats" } });
  }
});

// ---------- GET /calendar --- Calendar view ---------- //
router.get("/calendar", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
    const posts = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        isNull(schema.socialPosts.deletedAt),
        sql`coalesce(${schema.socialPosts.scheduledAt}, ${schema.socialPosts.publishedAt}) >= ${startDate}::timestamptz`,
        sql`coalesce(${schema.socialPosts.scheduledAt}, ${schema.socialPosts.publishedAt}) <= ${endDate}::timestamptz`,
      )).orderBy(asc(schema.socialPosts.scheduledAt));
    });
    // Group posts by date
    const calendar: Record<string, typeof posts> = {};
    for (const post of posts) {
      const dateKey = (post.scheduledAt || post.publishedAt || post.createdAt)
        .toISOString().split("T")[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(post);
    }
    return res.json({ data: { month, year, calendar } });
  } catch (err) {
    logger.error({ err, tenantId }, 'Calendar view error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get calendar view" } });
  }
});

// ---------- POST / --- Create social post ---------- //
router.post("/", validateBody(createPostSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, postType, platform, content, hashtags, mediaUrls, scheduledAt, metadata } = req.body;

    const initialStatus = scheduledAt ? "scheduled" : "draft";
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.socialPosts).values({
        tenantId, agentId: userId, socialAccountId: null,
        transactionId: transactionId || null, postType, platform, content,
        hashtags: hashtags || [], mediaAssetIds: [],
        contentVariations: [], status: initialStatus,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        complianceStatus: "pending",
        metadata: metadata || {},
      }).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.create", resourceType: "social_post",
      resourceId: post.id, details: { postType, platform, status: initialStatus },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create social post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create social post" } });
  }
});

// ---------- POST /generate --- AI-generate post content ---------- //
router.post("/generate", validateBody(generatePostSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, postType, platform, tone } = req.body;

    // Simulate AI-generated content
    const toneLabel = tone || "professional";
    const typeLabels: Record<string, string> = {
      new_listing: "Just listed! Check out this stunning property.",
      open_house: "Join us for an open house this weekend!",
      under_contract: "Exciting news - this property is now under contract!",
      price_reduction: "Price just reduced! Now is the perfect time to make an offer.",
      just_sold: "Another successful closing! Congratulations to the new homeowners.",
      testimonial: "We love hearing from our happy clients!",
      market_update: "Here is your latest real estate market update.",
      evergreen: "Thinking about buying or selling? We are here to help!",
      custom: "Discover what makes our brokerage different.",
    };
    const generatedContent = typeLabels[postType] || "Check out our latest real estate update!";
    const generatedHashtags = ["#realestate", "#" + platform, "#" + postType.replace(/_/g, ""), "#coastalcrest"];
    const captionVariations = [
      generatedContent + " " + generatedHashtags.join(" "),
      "🏠 " + generatedContent + " Contact us today!",
      generatedContent + " Call us for more details. " + generatedHashtags.slice(0, 2).join(" "),
    ];
    // Create a draft post with AI-generated content
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.socialPosts).values({
        tenantId, agentId: userId, transactionId: transactionId || null,
        postType, platform, content: generatedContent,
        hashtags: generatedHashtags, contentVariations: captionVariations,
        status: "draft", complianceStatus: "pending",
        metadata: { generatedBy: "ai", tone: toneLabel },
      }).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.generate", resourceType: "social_post",
      resourceId: post.id, details: { postType, platform, tone: toneLabel },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: { post, generatedContent, hashtags: generatedHashtags, captionVariations } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Generate post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate post content" } });
  }
});

// ---------- POST /bulk-schedule --- Bulk generate and schedule posts ---------- //
router.post("/bulk-schedule", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { startDate, endDate, platforms, postTypes, transactionId } = req.body;
    if (!startDate || !endDate || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "startDate, endDate, and platforms are required" } });
    }
    const types = postTypes && Array.isArray(postTypes) ? postTypes : ["evergreen"];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const createdPosts = await withTenantContext(tenantId, async (tx) => {
      const posts = [];
      const current = new Date(start);
      let dayIndex = 0;
      while (current <= end) {
        const plat = platforms[dayIndex % platforms.length];
        const pt = types[dayIndex % types.length];
        const scheduleTime = new Date(current);
        scheduleTime.setHours(10, 0, 0, 0);
        const [post] = await tx.insert(schema.socialPosts).values({
          tenantId, agentId: userId, transactionId: transactionId || null,
          postType: pt, platform: plat,
          content: "Scheduled " + pt.replace(/_/g, " ") + " post for " + plat,
          hashtags: ["#realestate", "#" + plat], status: "scheduled",
          scheduledAt: scheduleTime, complianceStatus: "pending",
          metadata: { bulkGenerated: true },
        }).returning();
        posts.push(post);
        current.setDate(current.getDate() + 1);
        dayIndex++;
      }
      return posts;
    });
    logAudit({ tenantId, userId, action: "social_post.bulk_schedule", resourceType: "social_post",
      details: { startDate, endDate, platforms, postTypes: types, count: createdPosts.length },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: { posts: createdPosts, totalScheduled: createdPosts.length } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Bulk schedule error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to bulk schedule posts" } });
  }
});

// ---------- GET /:id --- Get single post detail ---------- //
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const post = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.id, id),
        eq(schema.socialPosts.tenantId, tenantId),
        isNull(schema.socialPosts.deletedAt),
      ));
      return row || null;
    });
    if (!post) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    }
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get social post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get social post" } });
  }
});

// ---------- PATCH /:id --- Update post ---------- //
router.patch("/:id", validateBody(updatePostSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    // Zod already validated and enforced at-least-one-field via .refine()
    const updates = { ...req.body };
    if (updates.scheduledAt) {
      updates.scheduledAt = new Date(updates.scheduledAt);
    }

    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)))
        .returning();
    });
    if (!post) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    logAudit({ tenantId, userId, action: "social_post.update", resourceType: "social_post",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update social post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update social post" } });
  }
});

// ---------- DELETE /:id --- Soft delete post ---------- //
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)))
        .returning();
    });
    if (!post) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    logAudit({ tenantId, userId, action: "social_post.delete", resourceType: "social_post",
      resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete social post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete social post" } });
  }
});

// ---------- POST /:id/compliance-check --- Run compliance check ---------- //
router.post("/:id/compliance-check", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    // Simulate compliance checks
    const issues: Array<{ rule: string; severity: string; description: string; passed: boolean }> = [];
    const contentLower = existing.content.toLowerCase();
    issues.push({ rule: "disclaimer_required", severity: "high",
      description: "Brokerage disclaimer must be included",
      passed: contentLower.includes("coastal crest") || contentLower.includes("brokerage") });
    issues.push({ rule: "license_number", severity: "high",
      description: "Agent license number should be referenced",
      passed: contentLower.includes("license") || contentLower.includes("lic#") });
    issues.push({ rule: "fair_housing", severity: "critical",
      description: "Content must not violate Fair Housing Act",
      passed: true });
    issues.push({ rule: "equal_opportunity", severity: "medium",
      description: "Equal Housing Opportunity statement recommended",
      passed: contentLower.includes("equal") || existing.platform === "twitter" });
    const failedIssues = issues.filter((i) => !i.passed);
    const finalStatus = failedIssues.length > 0 ? "failed" : "passed";
    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({
        complianceStatus: finalStatus, complianceIssues: issues,
        complianceCheckedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.socialPosts.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.compliance_check", resourceType: "social_post",
      resourceId: id, details: { complianceStatus: finalStatus, totalChecks: issues.length, failedChecks: failedIssues.length },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { post: updated, complianceResult: { status: finalStatus, totalChecks: issues.length, failedChecks: failedIssues.length, issues } } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Compliance check error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to run compliance check" } });
  }
});

// ---------- POST /:id/approve --- Approve post (managing_broker+) ---------- //
router.post("/:id/approve", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    if (existing.status === "published") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Post is already published" } });
    const newStatus = existing.scheduledAt ? "scheduled" : "published";
    const updateData: Record<string, unknown> = {
      status: newStatus, approvedBy: userId, approvedAt: new Date(), updatedAt: new Date(),
    };
    if (newStatus === "published") updateData.publishedAt = new Date();
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set(updateData)
        .where(eq(schema.socialPosts.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.approve", resourceType: "social_post",
      resourceId: id, details: { newStatus, previousStatus: existing.status },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Approve post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to approve post" } });
  }
});

// ---------- POST /:id/reject --- Reject post (managing_broker+) ---------- //
router.post("/:id/reject", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "reason is required" } });
    }
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({
        status: "rejected", rejectionReason: reason.trim(),
        rejectedBy: userId, rejectedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.socialPosts.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.reject", resourceType: "social_post",
      resourceId: id, details: { reason: reason.trim(), previousStatus: existing.status },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Reject post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to reject post" } });
  }
});

// ---------- POST /:id/publish --- Publish post immediately ---------- //
router.post("/:id/publish", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialPosts).where(and(
        eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    if (existing.status === "published") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Post is already published" } });
    if (existing.complianceStatus === "failed") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot publish a compliance-failed post" } });
    // Simulate publishing to platform
    const platformPostId = "ext_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
    const platformPostUrl = "https://" + existing.platform + ".com/post/" + platformPostId;
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({
        status: "published", platformPostId, platformPostUrl,
        publishedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.socialPosts.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "social_post.publish", resourceType: "social_post",
      resourceId: id, details: { platform: existing.platform, platformPostId, platformPostUrl },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Publish post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to publish post" } });
  }
});

// ---------- POST /:id/reschedule --- Reschedule post ---------- //
router.post("/:id/reschedule", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "scheduledAt is required" } });
    }
    const [post] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialPosts).set({
        scheduledAt: new Date(scheduledAt), status: "scheduled", updatedAt: new Date(),
      }).where(and(eq(schema.socialPosts.id, id), eq(schema.socialPosts.tenantId, tenantId), isNull(schema.socialPosts.deletedAt)))
        .returning();
    });
    if (!post) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social post not found" } });
    logAudit({ tenantId, userId, action: "social_post.reschedule", resourceType: "social_post",
      resourceId: id, details: { scheduledAt }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: post });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Reschedule post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to reschedule post" } });
  }
});

// ---------- GET /approval-queue --- Posts pending broker approval (managing_broker+) ---------- //
router.get("/approval-queue", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * pageSize;
    const conditions = [
      eq(schema.socialPosts.tenantId, tenantId),
      eq(schema.socialPosts.status, "pending_approval"),
      isNull(schema.socialPosts.deletedAt),
    ];
    const [posts, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.socialPosts)
        .where(and(...conditions)).orderBy(asc(schema.socialPosts.createdAt))
        .limit(pageSize).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.socialPosts).where(and(...conditions));
      return [rows, cr];
    });
    const total = (countRes[0]?.total as number) ?? 0;
    sendPaginated(res, posts, { page, pageSize, total });
  } catch (err) {
    logger.error({ err, tenantId }, 'Approval queue error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get approval queue" } });
  }
});

// ---------- POST /milestone --- Auto-generate milestone post ---------- //
router.post("/milestone", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, milestoneType } = req.body;
    if (!transactionId || !milestoneType) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "transactionId and milestoneType are required" } });
    }
    // Verify transaction exists
    const txnExists = await withTenantContext(tenantId, async (tx) => {
      const [txn] = await tx.select({ id: schema.transactions.id })
        .from(schema.transactions).where(and(
          eq(schema.transactions.id, transactionId),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt)));
      return !!txn;
    });
    if (!txnExists) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction not found" } });
    // Generate milestone-specific content
    const milestoneContent: Record<string, string> = {
      new_listing: "Thrilled to announce a brand new listing! This stunning property just hit the market.",
      under_contract: "Great news! This property is officially under contract. Congratulations to all parties!",
      price_change: "Price update on this fantastic property! Now is the perfect time to schedule a showing.",
      closed: "JUST SOLD! Another successful closing. Thank you to my amazing clients for trusting me with this journey.",
      inspection_complete: "Inspection complete and moving forward! One step closer to closing day.",
      appraisal_received: "Appraisal is in and looking great! The process continues smoothly.",
    };
    const content = milestoneContent[milestoneType] || "Exciting milestone reached in this transaction!"
    const postTypeMap: Record<string, string> = {
      new_listing: "new_listing", under_contract: "under_contract",
      price_change: "price_reduction", closed: "just_sold",
      inspection_complete: "custom", appraisal_received: "custom",
    };
    const postType = postTypeMap[milestoneType] || "custom";
    const hashtags = ["#realestate", "#" + milestoneType.replace(/_/g, ""), "#milestone", "#coastalcrest"];
    // Create draft posts for multiple platforms
    const platforms = ["facebook", "instagram"];
    const posts = await withTenantContext(tenantId, async (tx) => {
      const created = [];
      for (const plat of platforms) {
        const [post] = await tx.insert(schema.socialPosts).values({
          tenantId, agentId: userId, transactionId, postType,
          platform: plat, content, hashtags, status: "draft",
          complianceStatus: "pending",
          metadata: { milestoneType, autoGenerated: true },
        }).returning();
        created.push(post);
      }
      return created;
    });
    logAudit({ tenantId, userId, action: "social_post.milestone", resourceType: "social_post",
      details: { transactionId, milestoneType, postsCreated: posts.length },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: { posts, milestoneType, content } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Milestone post error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create milestone post" } });
  }
});

export default router;
