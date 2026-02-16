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
    const { userId, tenantId } = req.user\!;
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
    const { userId, tenantId } = req.user\!;
    const { platform, accountType, accountName, accountId, accessToken, refreshToken, tokenExpiresAt, profileUrl, avatarUrl, scopes } = req.body;
    if (\!platform || \!accountName || \!accountId) {
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
    const { userId, tenantId } = req.user\!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["accessToken", "refreshToken", "tokenExpiresAt", "profileUrl", "avatarUrl", "scopes", "accountName"];
    for (const field of allowedFields) {
      if (req.body[field] \!== undefined) {
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
    if (\!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
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
    const { userId, tenantId } = req.user\!;
    const { id } = req.params;
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.socialAccounts).set({ deletedAt: new Date(), connectionStatus: "disconnected", updatedAt: new Date() })
        .where(and(eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)))
        .returning();
    });
    if (\!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
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
    const { userId, tenantId } = req.user\!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialAccounts).where(and(
        eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)));
    });
    if (\!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
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
    const { tenantId } = req.user\!;
    const { id } = req.params;
    const [account] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.socialAccounts).where(and(
        eq(schema.socialAccounts.id, id), eq(schema.socialAccounts.tenantId, tenantId), isNull(schema.socialAccounts.deletedAt)));
    });
    if (\!account) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Social account not found" } });
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
    const { tenantId } = req.user\!;
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
    const { tenantId } = req.user\!;
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
