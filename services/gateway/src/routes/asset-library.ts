import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// ---------- GET / --- List library assets ---------- //
router.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const category = req.query.category as string;
    const subcategory = req.query.subcategory as string;
    const licenseType = req.query.licenseType as string;
    const isSeasonal = req.query.isSeasonal as string;
    const tagsFilter = req.query.tags as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const conditions = [
      eq(schema.libraryAssets.tenantId, tenantId),
      isNull(schema.libraryAssets.deletedAt),
    ];
    if (category) conditions.push(eq(schema.libraryAssets.category, category));
    if (subcategory) conditions.push(eq(schema.libraryAssets.subcategory, subcategory));
    if (licenseType) conditions.push(eq(schema.libraryAssets.licenseType, licenseType));
    if (isSeasonal === "true") conditions.push(eq(schema.libraryAssets.isSeasonal, true));
    if (search) conditions.push(sql`${schema.libraryAssets.name} ilike ${"%" + search + "%"}`);
    const orderClause = sortBy === "name" ? asc(schema.libraryAssets.name)
      : sortBy === "downloads" ? desc(schema.libraryAssets.downloadCount)
      : desc(schema.libraryAssets.createdAt);
    const [assets, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.libraryAssets)
        .where(and(...conditions)).orderBy(orderClause)
        .limit(limit).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.libraryAssets).where(and(...conditions));
      return [rows, cr];
    });
    const total = countRes[0]?.total ?? 0;
    return res.json({ data: assets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err, tenantId }, 'List library assets error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list library assets" } });
  }
});

// ---------- GET /categories --- Get distinct categories with counts ---------- //
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const categories = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        category: schema.libraryAssets.category,
        count: sql`count(*)::int`,
      }).from(schema.libraryAssets).where(and(
        eq(schema.libraryAssets.tenantId, tenantId),
        isNull(schema.libraryAssets.deletedAt),
      )).groupBy(schema.libraryAssets.category)
        .orderBy(asc(schema.libraryAssets.category));
    });
    return res.json({ data: categories });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get categories error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get categories" } });
  }
});

// ---------- GET /seasonal --- Get current seasonal assets ---------- //
router.get("/seasonal", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const currentMonth = new Date().getMonth() + 1;
    const assets = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.libraryAssets).where(and(
        eq(schema.libraryAssets.tenantId, tenantId),
        eq(schema.libraryAssets.isSeasonal, true),
        isNull(schema.libraryAssets.deletedAt),
        sql`${schema.libraryAssets.seasonalMonths} @> ARRAY[${currentMonth}]::int[]`,
      )).orderBy(desc(schema.libraryAssets.downloadCount))
        .limit(50);
    });
    return res.json({ data: assets });
  } catch (err) {
    logger.error({ err, tenantId }, 'Seasonal assets error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get seasonal assets" } });
  }
});

// ---------- GET /recommended --- AI recommendations based on preferences ---------- //
router.get("/recommended", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    // Fetch agent preferences
    const [prefs] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaPreferences).where(and(
        eq(schema.mediaPreferences.userId, userId),
        eq(schema.mediaPreferences.tenantId, tenantId),
      ));
    });
    const preferredStyles = prefs?.preferredStyles || [];
    const colorPrefs = prefs?.colorPreferences || [];
    // Return popular assets matching preferences
    const assets = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.libraryAssets).where(and(
        eq(schema.libraryAssets.tenantId, tenantId),
        isNull(schema.libraryAssets.deletedAt),
      )).orderBy(desc(schema.libraryAssets.downloadCount))
        .limit(20);
    });
    return res.json({ data: { assets, preferences: prefs || null } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Recommended assets error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get recommended assets" } });
  }
});

// ---------- POST / --- Upload custom asset to library ---------- //
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { category, subcategory, name, description, filePath, mimeType, licenseType, tags } = req.body;
    if (!category || !name || !filePath || !mimeType) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "category, name, filePath, and mimeType are required" } });
    }
    const validCategories = ["stock_photos", "icons", "backgrounds", "music", "sound_effects", "fonts", "animations"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "category must be one of: " + validCategories.join(", ") } });
    }
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.libraryAssets).values({
        tenantId, uploadedBy: userId,
        category, subcategory: subcategory || null,
        name, description: description || null,
        filePath, mimeType,
        licenseType: licenseType || "royalty_free",
        tags: tags || [], downloadCount: 0,
        isSeasonal: false, isGlobal: false,
      }).returning();
    });
    logAudit({ tenantId, userId, action: "library.upload", resourceType: "library_asset",
      resourceId: asset.id, details: { category, name, mimeType },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: asset });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Upload library asset error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to upload library asset" } });
  }
});

router.get("/templates", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const templateType = req.query.templateType as string;
    const category = req.query.category as string;
    const isGlobal = req.query.isGlobal as string;
    const isPremium = req.query.isPremium as string;
    const conditions = [
      eq(schema.mediaTemplates.tenantId, tenantId),
      isNull(schema.mediaTemplates.deletedAt),
    ];
    if (templateType) conditions.push(eq(schema.mediaTemplates.templateType, templateType));
    if (category) conditions.push(eq(schema.mediaTemplates.category, category));
    if (isGlobal === "true") conditions.push(eq(schema.mediaTemplates.isGlobal, true));
    if (isPremium === "true") conditions.push(eq(schema.mediaTemplates.isPremium, true));
    const [templates, countRes] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.mediaTemplates)
        .where(and(...conditions)).orderBy(desc(schema.mediaTemplates.createdAt))
        .limit(limit).offset(offset);
      const cr = await tx.select({ total: sql`count(*)::int` })
        .from(schema.mediaTemplates).where(and(...conditions));
      return [rows, cr];
    });
    const total = countRes[0]?.total ?? 0;
    return res.json({ data: templates, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err, tenantId }, 'List templates error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } });
  }
});

// ---------- POST /templates --- Create template ---------- //
router.post("/templates", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { name, description, templateType, category, templateData, defaultPrompt, outputFormat, outputDimensions } = req.body;
    if (!name || !templateType) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name and templateType are required" } });
    }
    const validTypes = ["listing_graphic", "social_graphic", "tour_video", "market_update", "testimonial", "agent_intro"];
    if (!validTypes.includes(templateType)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "templateType must be one of: " + validTypes.join(", ") } });
    }
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.mediaTemplates).values({
        tenantId, createdBy: userId,
        name, description: description || null,
        templateType, category: category || null,
        templateData: templateData || {},
        defaultPrompt: defaultPrompt || null,
        outputFormat: outputFormat || null,
        outputDimensions: outputDimensions || null,
        isGlobal: false, isPremium: false,
      }).returning();
    });
    logAudit({ tenantId, userId, action: "template.create", resourceType: "media_template",
      resourceId: template.id, details: { name, templateType },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(201).json({ data: template });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create template error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create template" } });
  }
});

// ---------- GET /templates/:id --- Get template detail ---------- //
router.get("/templates/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const template = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.mediaTemplates).where(and(
        eq(schema.mediaTemplates.id, id),
        eq(schema.mediaTemplates.tenantId, tenantId),
        isNull(schema.mediaTemplates.deletedAt),
      ));
      return row || null;
    });
    if (!template) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
    return res.json({ data: template });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get template error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get template" } });
  }
});

// ---------- PATCH /templates/:id --- Update template ---------- //
router.patch("/templates/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "description", "templateType", "category", "templateData", "defaultPrompt", "outputFormat", "outputDimensions"];
    for (const field of allowedFields) {
      if (req.body[field]  !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaTemplates)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.mediaTemplates.id, id),
          eq(schema.mediaTemplates.tenantId, tenantId),
          isNull(schema.mediaTemplates.deletedAt),
        )).returning();
    });
    if (!template) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
    logAudit({ tenantId, userId, action: "template.update", resourceType: "media_template",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: template });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update template error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update template" } });
  }
});

// ---------- DELETE /templates/:id --- Soft delete template ---------- //
router.delete("/templates/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [template] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.mediaTemplates)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.mediaTemplates.id, id),
          eq(schema.mediaTemplates.tenantId, tenantId),
          isNull(schema.mediaTemplates.deletedAt),
        )).returning();
    });
    if (!template) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
    logAudit({ tenantId, userId, action: "template.delete", resourceType: "media_template",
      resourceId: id, details: { name: template.name }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete template error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } });
  }
});

// ---------- GET /preferences --- Get agent media preferences ---------- //
router.get("/preferences", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const [prefs] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.mediaPreferences).where(and(
        eq(schema.mediaPreferences.userId, userId),
        eq(schema.mediaPreferences.tenantId, tenantId),
      ));
    });
    return res.json({ data: prefs || null });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get preferences error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get preferences" } });
  }
});

// ---------- PUT /preferences --- Update agent media preferences ---------- //
router.put("/preferences", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { preferredStyles, preferredMusicMood, colorPreferences, brandingDefaults, favoriteTemplateIds, favoriteAssetIds } = req.body;
    // Check if preferences exist
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select({ id: schema.mediaPreferences.id }).from(schema.mediaPreferences).where(and(
        eq(schema.mediaPreferences.userId, userId),
        eq(schema.mediaPreferences.tenantId, tenantId),
      ));
    });
    const values = {
      preferredStyles: preferredStyles || [],
      preferredMusicMood: preferredMusicMood || null,
      colorPreferences: colorPreferences || [],
      brandingDefaults: brandingDefaults || {},
      favoriteTemplateIds: favoriteTemplateIds || [],
      favoriteAssetIds: favoriteAssetIds || [],
      updatedAt: new Date(),
    };
    let prefs;
    if (existing) {
      const [updated] = await withTenantContext(tenantId, async (tx) => {
        return tx.update(schema.mediaPreferences).set(values)
          .where(eq(schema.mediaPreferences.id, existing.id)).returning();
      });
      prefs = updated;
    } else {
      const [created] = await withTenantContext(tenantId, async (tx) => {
        return tx.insert(schema.mediaPreferences).values({
          tenantId, userId, ...values,
        }).returning();
      });
      prefs = created;
    }
    logAudit({ tenantId, userId, action: "preferences.update", resourceType: "media_preferences",
      resourceId: prefs.id, details: { preferredStyles, colorPreferences },
      ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: prefs });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update preferences error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update preferences" } });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const asset = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.libraryAssets).where(and(
        eq(schema.libraryAssets.id, id),
        eq(schema.libraryAssets.tenantId, tenantId),
        isNull(schema.libraryAssets.deletedAt),
      ));
      return row || null;
    });
    if (!asset) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Library asset not found" } });
    return res.json({ data: asset });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get library asset error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get library asset" } });
  }
});

// ---------- PATCH /:id --- Update library asset ---------- //
router.patch("/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "description", "category", "subcategory", "licenseType", "tags", "isSeasonal", "seasonalMonths"];
    for (const field of allowedFields) {
      if (req.body[field]  !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
    }
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.libraryAssets)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.libraryAssets.id, id),
          eq(schema.libraryAssets.tenantId, tenantId),
          isNull(schema.libraryAssets.deletedAt),
        )).returning();
    });
    if (!asset) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Library asset not found" } });
    logAudit({ tenantId, userId, action: "library.update", resourceType: "library_asset",
      resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: asset });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update library asset error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update library asset" } });
  }
});

// ---------- DELETE /:id --- Soft delete library asset ---------- //
router.delete("/:id", requireRole("managing_broker"), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.libraryAssets)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.libraryAssets.id, id),
          eq(schema.libraryAssets.tenantId, tenantId),
          isNull(schema.libraryAssets.deletedAt),
        )).returning();
    });
    if (!asset) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Library asset not found" } });
    logAudit({ tenantId, userId, action: "library.delete", resourceType: "library_asset",
      resourceId: id, details: { name: asset.name }, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ data: { id, deleted: true } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete library asset error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete library asset" } });
  }
});

// ---------- POST /:id/download --- Increment download count ---------- //
router.post("/:id/download", async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const [asset] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.libraryAssets)
        .set({ downloadCount: sql`${schema.libraryAssets.downloadCount} + 1`, updatedAt: new Date() })
        .where(and(
          eq(schema.libraryAssets.id, id),
          eq(schema.libraryAssets.tenantId, tenantId),
          isNull(schema.libraryAssets.deletedAt),
        )).returning();
    });
    if (!asset) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Library asset not found" } });
    return res.json({ data: { id: asset.id, filePath: asset.filePath, downloadCount: asset.downloadCount } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Download asset error');
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to download asset" } });
  }
});

export default router;
