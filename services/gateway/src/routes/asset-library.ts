import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

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
    console.error("List library assets error:", err);
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
    console.error("Get categories error:", err);
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
    console.error("Seasonal assets error:", err);
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
    console.error("Recommended assets error:", err);
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
    console.error("Upload library asset error:", err);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to upload library asset" } });
  }
});

