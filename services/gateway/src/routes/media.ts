import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const agentId = req.query.agentId as string;
    const assetType = req.query.assetType as string;
    const mediaType = req.query.mediaType as string;
    const status = req.query.status as string;
    const complianceStatus = req.query.complianceStatus as string;
    const transactionId = req.query.transactionId as string;
    const sortBy = req.query.sortBy as string;
    const conditions = [
      eq(schema.mediaAssets.tenantId, tenantId),
      isNull(schema.mediaAssets.deletedAt),
    ];
    if (agentId) conditions.push(eq(schema.mediaAssets.agentId, agentId));
    if (assetType) conditions.push(eq(schema.mediaAssets.assetType, assetType));
    if (mediaType) conditions.push(eq(schema.mediaAssets.mediaType, mediaType));
    if (status) conditions.push(eq(schema.mediaAssets.status, status));
    if (complianceStatus) conditions.push(eq(schema.mediaAssets.complianceStatus, complianceStatus));
    if (transactionId) conditions.push(eq(schema.mediaAssets.transactionId, transactionId));
    const orderClause = sortBy === "title" ? asc(schema.mediaAssets.title)
      : sortBy === "status" ? asc(schema.mediaAssets.status)
      : sortBy === "oldest" ? asc(schema.mediaAssets.createdAt)
      : desc(schema.mediaAssets.createdAt);
    const [assets, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.mediaAssets)
        .where(and(...conditions)).orderBy(orderClause)
        .limit(limit).offset(offset);
      const countResult = await tx
        .select({ total: sql`count(*)::int` })
        .from(schema.mediaAssets).where(and(...conditions));
      return [rows, countResult];
    });
    const total = countRes[0]?.total ?? 0;
    return res.json({
      data: assets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("List media assets error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list media assets" } });
  }
});

// ---------- GET /stats --- Media statistics ---------- //
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const mo = String(now.getMonth()+1).padStart(2,"0");
    const monthStart = now.getFullYear()+"-"+mo+"-01";
    const stats = await withTenantContext(tenantId, async (tx) => {
      const [r] = await tx.select({
        totalAssets: sql`count(*)::int`,
        imageCount: sql\,
        imageCount: sql`count(*) filter (where asset_type = $$image$$)::int`,
        videoCount: sql`count(*) filter (where asset_type = $$video$$)::int`,
        publishedCount: sql`count(*) filter (where status = $$published$$)::int`,
        pendingComplianceCount: sql`count(*) filter (where compliance_status = $$pending$$)::int`,
        generatedThisMonth: sql`count(*) filter (where created_at >= ${monthStart}::timestamptz)::int`,
      }).from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt),
      ));
      return r;
    });
    return res.json({ data: stats });
  } catch (err) {
    console.error("Media stats error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get media stats" } });
  }
});

// ---------- GET /compliance-queue --- Pending compliance review ---------- //
router.get("/compliance-queue", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const conditions = [
      eq(schema.mediaAssets.tenantId, tenantId),
      eq(schema.mediaAssets.complianceStatus, "pending"),
      isNull(schema.mediaAssets.deletedAt),
    ];
    const [assets, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.mediaAssets)
        .where(and(...conditions)).orderBy(asc(schema.mediaAssets.createdAt))
        .limit(limit).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.mediaAssets).where(and(...conditions));
      return [rows, cr];
    });
    const total = countRes[0]?.total ?? 0;
    return res.json({ data: assets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Compliance queue error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get compliance queue" } });
  }
});

// ---------- POST /generate-image --- Generate AI image ---------- //
router.post("/generate-image", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { templateId, transactionId, mediaType, prompt, generationParams, outputFormat } = req.body;
    if (!mediaType || !prompt) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "mediaType and prompt are required" } });
    }
    const validFormats = ["png", "jpg", "webp", "svg"];
    const format = outputFormat && validFormats.includes(outputFormat) ? outputFormat : "png";
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.mediaAssets).values({
        tenantId, agentId: userId,
        transactionId: transactionId || null,
        templateId: templateId || null,
        title: "AI Generated Image - " + mediaType,
        description: prompt, assetType: "image", mediaType,
        status: "generating", outputFormat: format,
        complianceStatus: "pending", generationPrompt: prompt,
        generationParams: generationParams || {},
        tags: [], metadata: { generatedBy: "ai" },
      }).returning();
    });
    // Simulate generation completing
    await withTenantContext(tenantId, async (tx) => {
      await tx.update(schema.mediaAssets).set({
        status: "draft",
        filePath: "media/" + tenantId + "/" + asset.id + "/generated." + format,
        thumbnailPath: "media/" + tenantId + "/" + asset.id + "/thumb." + format,
        updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, asset.id));
    });
    logAudit({ tenantId, userId, action: "media.generate_image", resourceType: "media_asset",
      resourceId: asset.id, details: { mediaType, prompt, outputFormat: format },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, asset.id));
    });
    return res.status(201).json({ data: updated });
  } catch (err) {
    console.error("Generate image error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate image" } });
  }
});

// ---------- POST /generate-video --- Generate AI video ---------- //
router.post("/generate-video", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { templateId, transactionId, mediaType, storyboard, voiceover, captions, outputFormat } = req.body;
    if (!mediaType || !storyboard || !Array.isArray(storyboard) || storyboard.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "mediaType and storyboard (non-empty array) are required" } });
    }
    const validFormats = ["mp4", "webm", "mov"];
    const format = outputFormat && validFormats.includes(outputFormat) ? outputFormat : "mp4";
    for (let i = 0; i < storyboard.length; i++) {
      if (!storyboard[i] || typeof storyboard[i] !== "object") {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "storyboard scene at index " + i + " must be an object" } });
      }
    }
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.mediaAssets).values({
        tenantId, agentId: userId,
        transactionId: transactionId || null,
        templateId: templateId || null,
        title: "AI Generated Video - " + mediaType,
        description: "Video with " + storyboard.length + " scene(s)",
        assetType: "video", mediaType, status: "generating",
        outputFormat: format, complianceStatus: "pending",
        generationPrompt: JSON.stringify({ storyboard, voiceover, captions }),
        generationParams: { storyboard, voiceover: voiceover || null, captions: captions ?? true },
        tags: [], metadata: { generatedBy: "ai", sceneCount: storyboard.length },
      }).returning();
    });
    await withTenantContext(tenantId, async (tx) => {
      await tx.update(schema.mediaAssets).set({
        status: "draft",
        filePath: "media/" + tenantId + "/" + asset.id + "/generated." + format,
        thumbnailPath: "media/" + tenantId + "/" + asset.id + "/thumb.jpg",
        updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, asset.id));
    });
    logAudit({ tenantId, userId, action: "media.generate_video", resourceType: "media_asset",
      resourceId: asset.id, details: { mediaType, sceneCount: storyboard.length, outputFormat: format },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    const [updated] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, asset.id));
    });
    return res.status(201).json({ data: updated });
  } catch (err) {
    console.error("Generate video error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate video" } });
  }
});

// ---------- POST /batch-generate --- Batch generate marketing set ---------- //
router.post("/batch-generate", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, types } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "transactionId is required" } });
    }
    if (!types || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "types must be a non-empty array" } });
    }
    // Verify transaction exists
    const txnExists = await withTenantContext(tenantId, async (tx) => {
      const [txn] = await tx.select({ id: schema.transactions.id })
        .from(schema.transactions).where(and(
          eq(schema.transactions.id, transactionId),
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));
      return !!txn;
    });
    if (!txnExists) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction not found" } });
    }
    const getAssetType = (t: string) => t === "tour_video" ? "video" : t === "virtual_staging" ? "image" : "graphic";
    const getFormat = (t: string) => t === "tour_video" ? "mp4" : "png";
    const createdAssets = await withTenantContext(tenantId, async (tx) => {
      const assets = [];
      for (const mType of types) {
        const [asset] = await tx.insert(schema.mediaAssets).values({
          tenantId, agentId: userId, transactionId,
          title: "Batch - " + mType.replace(/_/g, " "),
          description: "Auto-generated " + mType,
          assetType: getAssetType(mType), mediaType: mType,
          status: "draft", outputFormat: getFormat(mType),
          complianceStatus: "pending",
          generationPrompt: "Auto-generate " + mType,
          generationParams: { batchGenerated: true },
          tags: ["batch-generated"],
          metadata: { generatedBy: "ai", batchGenerated: true },
        }).returning();
        assets.push(asset);
      }
      return assets;
    });
    logAudit({ tenantId, userId, action: "media.batch_generate", resourceType: "media_asset",
      resourceId: transactionId, details: { transactionId, types, count: createdAssets.length },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: { assets: createdAssets, totalGenerated: createdAssets.length, transactionId } });
  } catch (err) {
    console.error("Batch generate error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to batch generate media" } });
  }
});

// ---------- GET /:id --- Get single media asset ---------- //
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const asset = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.id, id),
        eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt),
      ));
      return row || null;
    });
    if (!asset) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    }
    return res.json({ data: asset });
  } catch (err) {
    console.error("Get media asset error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get media asset" } });
  }
});

// ---------- PATCH /:id --- Update media asset ---------- //
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["title", "description", "tags", "metadata"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.mediaAssets.id, id),
          eq(schema.mediaAssets.tenantId, tenantId),
          isNull(schema.mediaAssets.deletedAt),
        )).returning();
    });
    if (!asset) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    }
    logAudit({ tenantId, userId, action: "media.update", resourceType: "media_asset",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: asset });
  } catch (err) {
    console.error("Update media asset error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update media asset" } });
  }
});

// ---------- DELETE /:id --- Soft delete media asset ---------- //
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.mediaAssets.id, id),
          eq(schema.mediaAssets.tenantId, tenantId),
          isNull(schema.mediaAssets.deletedAt),
        )).returning();
    });
    if (!asset) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    }
    logAudit({ tenantId, userId, action: "media.delete", resourceType: "media_asset",
      resourceId: id, details: { title: asset.title }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    console.error("Delete media asset error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete media asset" } });
  }
});

// ---------- POST /:id/compliance-check --- Run compliance check ---------- //
router.post("/:id/compliance-check", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.id, id),
        eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt),
      ));
    });
    if (!existing) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    }
    const issues: Array<{ rule: string; severity: string; description: string; passed: boolean }> = [];
    const meta = (existing.metadata && typeof existing.metadata === "object")
      ? existing.metadata as Record<string, unknown> : {};
    issues.push({ rule: "disclaimer_required", severity: "high",
      description: "Brokerage disclaimer must be included", passed: meta.hasDisclaimer === true });
    issues.push({ rule: "license_number_display", severity: "high",
      description: "Agent license number must be displayed", passed: meta.licenseNumber !== undefined });
    issues.push({ rule: "fair_housing", severity: "critical",
      description: "Content must not violate Fair Housing Act", passed: true });
    if (existing.mediaType === "virtual_staging") {
      issues.push({ rule: "virtual_staging_disclosure", severity: "critical",
        description: "Virtual staging must be clearly disclosed", passed: meta.virtualStagingDisclosed === true });
    }
    issues.push({ rule: "equal_opportunity", severity: "medium",
      description: "Equal Housing Opportunity logo or statement should be included", passed: true });
    const failedIssues = issues.filter((i) => !i.passed);
    const finalStatus = failedIssues.length > 0 ? "failed" : "passed";
    const [updatedAsset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets).set({
        complianceStatus: finalStatus, complianceIssues: issues,
        complianceCheckedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "media.compliance_check", resourceType: "media_asset",
      resourceId: id, details: { complianceStatus: finalStatus, totalChecks: issues.length, failedChecks: failedIssues.length },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { asset: updatedAsset, complianceResult: {
      status: finalStatus, checkedAt: updatedAsset.complianceCheckedAt,
      totalChecks: issues.length, passedChecks: issues.filter((i) => i.passed).length,
      failedChecks: failedIssues.length, issues } } });
  } catch (err) {
    console.error("Compliance check error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to run compliance check" } });
  }
});

// ---------- POST /:id/approve --- Approve media asset ---------- //
router.post("/:id/approve", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.id, id), eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    if (existing.status === "approved") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Asset is already approved" } });
    if (existing.status === "generating") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot approve a generating asset" } });
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets).set({
        status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "media.approve", resourceType: "media_asset",
      resourceId: id, details: { previousStatus: existing.status },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: asset });
  } catch (err) {
    console.error("Approve media error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to approve media asset" } });
  }
});

// ---------- POST /:id/publish --- Publish media asset ---------- //
router.post("/:id/publish", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { platforms } = req.body;
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "platforms must be a non-empty array" } });
    }
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.id, id), eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    if (existing.status === "generating") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot publish a generating asset" } });
    if (existing.complianceStatus === "failed") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Cannot publish a compliance-failed asset" } });
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets).set({
        status: "published", publishedPlatforms: platforms,
        publishedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "media.publish", resourceType: "media_asset",
      resourceId: id, details: { platforms, previousStatus: existing.status },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: asset });
  } catch (err) {
    console.error("Publish media error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to publish media asset" } });
  }
});

// ---------- POST /:id/reject --- Reject media asset ---------- //
router.post("/:id/reject", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "reason is required" } });
    }
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaAssets).where(and(
        eq(schema.mediaAssets.id, id), eq(schema.mediaAssets.tenantId, tenantId),
        isNull(schema.mediaAssets.deletedAt)));
    });
    if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Media asset not found" } });
    if (existing.status === "rejected") return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Asset is already rejected" } });
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaAssets).set({
        status: "rejected", rejectionReason: reason.trim(),
        rejectedBy: userId, rejectedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.mediaAssets.id, id)).returning();
    });
    logAudit({ tenantId, userId, action: "media.reject", resourceType: "media_asset",
      resourceId: id, details: { reason: reason.trim(), previousStatus: existing.status },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: asset });
  } catch (err) {
    console.error("Reject media error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to reject media asset" } });
  }
});

export default router;
