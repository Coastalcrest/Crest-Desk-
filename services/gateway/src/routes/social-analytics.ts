import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// ============================================================
// SOCIAL ACCOUNTS
// ============================================================

// ---------- GET /accounts --- List connected social accounts ---------- //
router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const platform = req.query.platform as string;
    const conditions = [
      eq(schema.socialAccounts.tenantId, tenantId),
      eq(schema.socialAccounts.agentId, userId),
      isNull(schema.socialAccounts.deletedAt),
    ];
    if (platform) conditions.push(eq(schema.socialAccounts.platform, platform));
    const accounts = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialAccounts)
        .where(and(...conditions)).orderBy(desc(schema.socialAccounts.createdAt));
    });
    return res.json({ data: accounts });
  } catch (err) {
    console.error("List social accounts error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list social accounts" } });
  }
});

// ---------- POST /accounts --- Connect new social account ---------- //
router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { platform, accountType, accountName, accountId, accessToken, refreshToken, tokenExpiresAt, profileUrl, avatarUrl, scopes } = req.body;
    if (!platform || !accountName || !accountId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "platform, accountName, and accountId are required" } });
    }
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.socialAccounts).values({
        tenantId, agentId: userId, platform,
        accountType: accountType || "personal",
        accountName, accountId,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        profileUrl: profileUrl || null,
        avatarUrl: avatarUrl || null,
        scopes: scopes || [],
        connectionStatus: "active",
      }).returning();
    });
    logAudit({ tenantId, userId, action: "social_account.connect", resourceType: "social_account",
      resourceId: account.id, details: { platform, accountName },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: account });
  } catch (err) {
    console.error("Connect social account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to connect social account" } });
  }
});

// ---------- PATCH /accounts/:id --- Update account ---------- //
router.patch("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["accessToken", "refreshToken", "tokenExpiresAt", "profileUrl", "avatarUrl", "scopes", "accountName"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "tokenExpiresAt") {
          updates[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else { updates[field] = req.body[field]; }
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialAccounts).set({ ...updates, connectionStatus: "active", updatedAt: new Date() })
        .where(and(eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)))
        .returning();
    });
    if (!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
    logAudit({ tenantId, userId, action: "social_account.update", resourceType: "social_account",
      resourceId: id, details: { updatedFields: Object.keys(updates) },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: account });
  } catch (err) {
    console.error("Update social account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update social account" } });
  }
});

// ---------- DELETE /accounts/:id --- Disconnect account ---------- //
router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialAccounts).set({ deletedAt: new Date(), connectionStatus: "disconnected", updatedAt: new Date() })
        .where(and(eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)))
        .returning();
    });
    if (!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
    logAudit({ tenantId, userId, action: "social_account.disconnect", resourceType: "social_account",
      resourceId: id, details: { platform: account.platform },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, disconnected: true } });
  } catch (err) {
    console.error("Disconnect social account error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to disconnect social account" } });
  }
});

// ---------- POST /accounts/:id/refresh --- Refresh OAuth token ---------- //
router.post("/accounts/:id/refresh", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialAccounts).where(and(
        eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
    // Simulate token refresh
    const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialAccounts).set({
        accessToken: "refreshed_" + Date.now(),
        tokenExpiresAt: newExpiry, connectionStatus: "active",
        lastSyncAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.socialAccounts.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "social_account.refresh_token", resourceType: "social_account",
      resourceId: id, details: { platform: existing.platform, newExpiry: newExpiry.toISOString() },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { account, tokenRefreshed: true, expiresAt: newExpiry } });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to refresh token" } });
  }
});

// ---------- GET /accounts/:id/health --- Check connection health ---------- //
router.get("/accounts/:id/health", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialAccounts).where(and(
        eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)));
    });
    if (!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
    const now = new Date();
    const tokenExpired = account.tokenExpiresAt ? account.tokenExpiresAt < now : false;
    const tokenExpiresSoon = account.tokenExpiresAt
      ? account.tokenExpiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 : false;
    const healthStatus = tokenExpired ? "expired" : tokenExpiresSoon ? "warning" : "healthy";
    return res.json({ data: {
      accountId: account.id, platform: account.platform,
      connectionStatus: account.connectionStatus, healthStatus,
      tokenExpired, tokenExpiresSoon,
      tokenExpiresAt: account.tokenExpiresAt, lastSyncAt: account.lastSyncAt,
    } });
  } catch (err) {
    console.error("Account health check error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to check account health" } });
  }
});

// ============================================================
// ENGAGEMENT
// ============================================================

// ---------- GET /engagement/:postId --- Get engagement for a post ---------- //
router.get("/engagement/:postId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { postId } = req.params;
    const metrics = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialEngagement).where(and(
        eq(schema.socialEngagement.tenantId, tenantId),
        eq(schema.socialEngagement.postId, postId),
      )).orderBy(desc(schema.socialEngagement.recordedAt));
    });
    return res.json({ data: metrics });
  } catch (err) {
    console.error("Get engagement error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get engagement metrics" } });
  }
});

// ---------- GET /engagement/summary --- Aggregate engagement stats ---------- //
router.get("/engagement/summary", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const result = await withTenantContext(tenantId, async (tx) => {
      // Aggregate from socialPosts directly
      const [totals] = await tx.select({
        totalImpressions: sql<number>`coalesce(sum(${schema.socialPosts.impressions}), 0)::int`,
        totalReach: sql<number>`coalesce(sum(${schema.socialPosts.reach}), 0)::int`,
        totalLikes: sql<number>`coalesce(sum(${schema.socialPosts.likes}), 0)::int`,
        totalComments: sql<number>`coalesce(sum(${schema.socialPosts.comments}), 0)::int`,
        totalShares: sql<number>`coalesce(sum(${schema.socialPosts.shares}), 0)::int`,
        totalClicks: sql<number>`coalesce(sum(${schema.socialPosts.clicks}), 0)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        eq(schema.socialPosts.status, "published"),
        isNull(schema.socialPosts.deletedAt),
      ));
      // By platform breakdown
      const byPlatform = await tx.select({
        platform: schema.socialPosts.platform,
        postCount: sql<number>`count(*)::int`,
        impressions: sql<number>`coalesce(sum(${schema.socialPosts.impressions}), 0)::int`,
        engagement: sql<number>`coalesce(sum(${schema.socialPosts.likes}) + sum(${schema.socialPosts.comments}) + sum(${schema.socialPosts.shares}), 0)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        eq(schema.socialPosts.status, "published"),
        isNull(schema.socialPosts.deletedAt),
      )).groupBy(schema.socialPosts.platform);
      // Top 5 posts by engagement
      const topPosts = await tx.select({
        id: schema.socialPosts.id,
        platform: schema.socialPosts.platform,
        postType: schema.socialPosts.postType,
        content: schema.socialPosts.content,
        impressions: schema.socialPosts.impressions,
        likes: schema.socialPosts.likes,
        comments: schema.socialPosts.comments,
        shares: schema.socialPosts.shares,
        publishedAt: schema.socialPosts.publishedAt,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        eq(schema.socialPosts.status, "published"),
        isNull(schema.socialPosts.deletedAt),
      )).orderBy(sql`(${schema.socialPosts.likes} + ${schema.socialPosts.comments} + ${schema.socialPosts.shares}) desc`).limit(5);
      return { ...totals, byPlatform, topPosts };
    });
    return res.json({ data: result });
  } catch (err) {
    console.error("Engagement summary error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get engagement summary" } });
  }
});

// ---------- GET /engagement/trends --- Monthly engagement trends ---------- //
router.get("/engagement/trends", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const trends = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        month: sql<string>`to_char(${schema.socialPosts.publishedAt}, $$YYYY-MM$$)`,
        postCount: sql<number>`count(*)::int`,
        totalImpressions: sql<number>`coalesce(sum(${schema.socialPosts.impressions}), 0)::int`,
        totalLikes: sql<number>`coalesce(sum(${schema.socialPosts.likes}), 0)::int`,
        totalComments: sql<number>`coalesce(sum(${schema.socialPosts.comments}), 0)::int`,
        totalShares: sql<number>`coalesce(sum(${schema.socialPosts.shares}), 0)::int`,
        totalClicks: sql<number>`coalesce(sum(${schema.socialPosts.clicks}), 0)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.tenantId, tenantId),
        eq(schema.socialPosts.status, "published"),
        isNull(schema.socialPosts.deletedAt),
        sql`${schema.socialPosts.publishedAt} >= ${twelveMonthsAgo.toISOString()}::timestamptz`,
      )).groupBy(sql`to_char(${schema.socialPosts.publishedAt}, $$YYYY-MM$$)`)
        .orderBy(sql`to_char(${schema.socialPosts.publishedAt}, $$YYYY-MM$$) asc`);
    });
    return res.json({ data: trends });
  } catch (err) {
    console.error("Engagement trends error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get engagement trends" } });
  }
});

// ============================================================
// CAMPAIGNS
// ============================================================

// ---------- GET /campaigns --- List campaigns ---------- //
router.get("/campaigns", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const campaignType = req.query.campaignType as string;
    const conditions = [
      eq(schema.socialCampaigns.tenantId, tenantId),
      isNull(schema.socialCampaigns.deletedAt),
    ];
    if (status) conditions.push(eq(schema.socialCampaigns.status, status));
    if (campaignType) conditions.push(eq(schema.socialCampaigns.campaignType, campaignType));
    const [campaigns, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.socialCampaigns)
        .where(and(...conditions)).orderBy(desc(schema.socialCampaigns.createdAt))
        .limit(limit).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.socialCampaigns).where(and(...conditions));
      return [rows, cr];
    });
    const total = (countRes[0]?.total as number) ?? 0;
    return res.json({ data: campaigns, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("List campaigns error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list campaigns" } });
  }
});

// ---------- POST /campaigns --- Create campaign ---------- //
router.post("/campaigns", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { name, description, campaignType, platforms, startDate, endDate, isEvergreen, contentStrategy } = req.body;
    if (!name || !campaignType) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name and campaignType are required" } });
    }
    const [campaign] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.socialCampaigns).values({
        tenantId, createdBy: userId, name, description: description || null,
        campaignType, platforms: platforms || [],
        startDate: startDate || null, endDate: endDate || null,
        isEvergreen: isEvergreen || false,
        contentStrategy: contentStrategy || {},
        status: "draft",
      }).returning();
    });
    logAudit({ tenantId, userId, action: "social_campaign.create", resourceType: "social_campaign",
      resourceId: campaign.id, details: { name, campaignType },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: campaign });
  } catch (err) {
    console.error("Create campaign error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create campaign" } });
  }
});

// ---------- GET /campaigns/:id --- Campaign detail with post summary ---------- //
router.get("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const result = await withTenantContext(tenantId, async (tx) => {
      const [campaign] = await tx.select().from(schema.socialCampaigns).where(and(
        eq(schema.socialCampaigns.id, id), eq(schema.socialCampaigns.tenantId, tenantId), isNull(schema.socialCampaigns.deletedAt)));
      if (!campaign) return null;
      // Get post summary for this campaign
      const [postSummary] = await tx.select({
        totalPosts: sql<number>`count(*)::int`,
        publishedPosts: sql<number>`count(*) filter (where ${schema.socialPosts.status} = $$published$$)::int`,
        scheduledPosts: sql<number>`count(*) filter (where ${schema.socialPosts.status} = $$scheduled$$)::int`,
        draftPosts: sql<number>`count(*) filter (where ${schema.socialPosts.status} = $$draft$$)::int`,
        totalImpressions: sql<number>`coalesce(sum(${schema.socialPosts.impressions}), 0)::int`,
        totalEngagement: sql<number>`coalesce(sum(${schema.socialPosts.likes}) + sum(${schema.socialPosts.comments}) + sum(${schema.socialPosts.shares}), 0)::int`,
      }).from(schema.socialPosts).where(and(
        eq(schema.socialPosts.campaignId, id),
        eq(schema.socialPosts.tenantId, tenantId),
        isNull(schema.socialPosts.deletedAt)));
      return { ...campaign, postSummary };
    });
    if (!result) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Campaign not found" } });
    return res.json({ data: result });
  } catch (err) {
    console.error("Get campaign error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get campaign" } });
  }
});

// ---------- PATCH /campaigns/:id --- Update campaign ---------- //
router.patch("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "description", "campaignType", "platforms", "startDate", "endDate", "status", "isEvergreen", "contentStrategy"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [campaign] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialCampaigns).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.socialCampaigns.id, id), eq(schema.socialCampaigns.tenantId, tenantId), isNull(schema.socialCampaigns.deletedAt)))
        .returning();
    });
    if (!campaign) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Campaign not found" } });
    logAudit({ tenantId, userId, action: "social_campaign.update", resourceType: "social_campaign",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: campaign });
  } catch (err) {
    console.error("Update campaign error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update campaign" } });
  }
});

// ---------- DELETE /campaigns/:id --- Soft delete campaign ---------- //
router.delete("/campaigns/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [campaign] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialCampaigns).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.socialCampaigns.id, id), eq(schema.socialCampaigns.tenantId, tenantId), isNull(schema.socialCampaigns.deletedAt)))
        .returning();
    });
    if (!campaign) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Campaign not found" } });
    logAudit({ tenantId, userId, action: "social_campaign.delete", resourceType: "social_campaign",
      resourceId: id, details: { name: campaign.name }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete campaign error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete campaign" } });
  }
});

// ============================================================
// CONTENT RULES
// ============================================================

// ---------- GET /content-rules --- List content rules ---------- //
router.get("/content-rules", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const rules = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialContentRules).where(and(
        eq(schema.socialContentRules.tenantId, tenantId),
        isNull(schema.socialContentRules.deletedAt),
      )).orderBy(desc(schema.socialContentRules.createdAt));
    });
    return res.json({ data: rules });
  } catch (err) {
    console.error("List content rules error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list content rules" } });
  }
});

// ---------- POST /content-rules --- Create content rule (managing_broker+) ---------- //
router.post("/content-rules", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { ruleType, postType, platform, requiresBrokerApproval, autoPublish, complianceTemplate, hashtagDefaults, brandingRequirements, schedulingRules } = req.body;
    if (!ruleType) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ruleType is required" } });
    }
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.socialContentRules).values({
        tenantId, createdBy: userId, ruleType,
        postType: postType || null, platform: platform || null,
        requiresBrokerApproval: requiresBrokerApproval || false,
        autoPublish: autoPublish || false,
        complianceTemplate: complianceTemplate || null,
        hashtagDefaults: hashtagDefaults || [],
        brandingRequirements: brandingRequirements || {},
        schedulingRules: schedulingRules || {},
      }).returning();
    });
    logAudit({ tenantId, userId, action: "social_content_rule.create", resourceType: "social_content_rule",
      resourceId: rule.id, details: { ruleType, postType, platform },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: rule });
  } catch (err) {
    console.error("Create content rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create content rule" } });
  }
});

// ---------- PATCH /content-rules/:id --- Update content rule (managing_broker+) ---------- //
router.patch("/content-rules/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["ruleType", "postType", "platform", "requiresBrokerApproval", "autoPublish", "complianceTemplate", "hashtagDefaults", "brandingRequirements", "schedulingRules"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialContentRules).set({ ...updates, updatedAt: new Date() })
        .where(and(eq(schema.socialContentRules.id, id), eq(schema.socialContentRules.tenantId, tenantId), isNull(schema.socialContentRules.deletedAt)))
        .returning();
    });
    if (!rule) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Content rule not found" } });
    logAudit({ tenantId, userId, action: "social_content_rule.update", resourceType: "social_content_rule",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: rule });
  } catch (err) {
    console.error("Update content rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update content rule" } });
  }
});

// ---------- DELETE /content-rules/:id --- Soft delete rule (managing_broker+) ---------- //
router.delete("/content-rules/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [rule] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialContentRules).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.socialContentRules.id, id), eq(schema.socialContentRules.tenantId, tenantId), isNull(schema.socialContentRules.deletedAt)))
        .returning();
    });
    if (!rule) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Content rule not found" } });
    logAudit({ tenantId, userId, action: "social_content_rule.delete", resourceType: "social_content_rule",
      resourceId: id, details: { ruleType: rule.ruleType }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete content rule error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete content rule" } });
  }
});

// ============================================================
// ROI ATTRIBUTION
// ============================================================

// ---------- GET /roi --- ROI attribution: social engagement to deals ---------- //
router.get("/roi", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const result = await withTenantContext(tenantId, async (tx) => {
      // Count contacts sourced from social media
      const [leadStats] = await tx.select({
        totalLeadsFromSocial: sql<number>`count(*) filter (where ${schema.contacts.source} in ($$facebook$$, $$instagram$$, $$linkedin$$, $$youtube$$, $$tiktok$$, $$twitter$$, $$social_media$$))::int`,
      }).from(schema.contacts).where(and(
        eq(schema.contacts.tenantId, tenantId),
        isNull(schema.contacts.deletedAt),
      ));
      // Count deals won from social-sourced contacts
      const [dealStats] = await tx.select({
        dealsFromSocial: sql<number>`count(*)::int`,
        revenueFromSocial: sql<string>`coalesce(sum(${schema.deals.dealValue}), 0)::text`,
      }).from(schema.deals)
        .innerJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
        .where(and(
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
          sql`${schema.deals.wonAt} is not null`,
          sql`${schema.contacts.source} in ($$facebook$$, $$instagram$$, $$linkedin$$, $$youtube$$, $$tiktok$$, $$twitter$$, $$social_media$$)`,
        ));
      // Calculate ROI metrics
      const totalLeads = leadStats.totalLeadsFromSocial || 0;
      const totalDeals = dealStats.dealsFromSocial || 0;
      const totalRevenue = parseFloat(dealStats.revenueFromSocial || "0");
      // Assume a nominal social media cost for ROI calculation
      const estimatedCost = 500; // Estimated monthly social media management cost
      const costPerLead = totalLeads > 0 ? (estimatedCost / totalLeads).toFixed(2) : "0";
      const roiPercentage = estimatedCost > 0 ? (((totalRevenue - estimatedCost) / estimatedCost) * 100).toFixed(1) : "0";
      return {
        totalLeadsFromSocial: totalLeads,
        dealsFromSocial: totalDeals,
        revenueFromSocial: totalRevenue.toFixed(2),
        costPerLead,
        roiPercentage,
      };
    });
    return res.json({ data: result });
  } catch (err) {
    console.error("ROI attribution error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get ROI attribution" } });
  }
});

export default router;
