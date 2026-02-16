import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { defaultLimiter } from '../middleware/rate-limiter';

const router = Router();

// ------------------------------------------------------------------ //
//  Public endpoint (no auth required)                                 //
// ------------------------------------------------------------------ //

// GET /public/:sdkKey — Public SDK config lookup (rate-limited)
router.get('/public/:sdkKey', defaultLimiter, async (req: Request, res: Response) => {
  try {
    const { sdkKey } = req.params;

    // Query without tenant context since we look up by unique sdk_key
    const [config] = await db.select({
      themeOverrides: schema.sdkConfigurations.themeOverrides,
      enabledWidgets: schema.sdkConfigurations.enabledWidgets,
      allowedOrigins: schema.sdkConfigurations.allowedOrigins,
    }).from(schema.sdkConfigurations)
      .where(eq(schema.sdkConfigurations.sdkKey, sdkKey));

    if (!config) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SDK configuration not found' } });
    }

    return res.json({ data: config });
  } catch (err) {
    console.error('Get public SDK config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get SDK configuration' } });
  }
});

// ------------------------------------------------------------------ //
//  Authenticated endpoints (owner only)                               //
// ------------------------------------------------------------------ //

router.use(requireAuth);

// GET / — List SDK configs for tenant
router.get('/', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const configs = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.sdkConfigurations)
        .where(eq(schema.sdkConfigurations.tenantId, tenantId))
        .orderBy(desc(schema.sdkConfigurations.createdAt));
    });

    return res.json({ data: configs, total: configs.length });
  } catch (err) {
    console.error('List SDK configs error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list SDK configurations' } });
  }
});

// POST / — Create SDK config
router.post('/', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { environment, allowedOrigins, enabledWidgets, themeOverrides, rateLimitPerMinute } = req.body;

    // Auto-generate SDK key
    const sdkKey = `sdk_${randomBytes(24).toString('hex')}`;

    const config = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.sdkConfigurations)
        .values({
          tenantId,
          sdkKey,
          environment: environment || 'production',
          allowedOrigins: allowedOrigins || [],
          enabledWidgets: enabledWidgets || [],
          themeOverrides: themeOverrides || {},
          rateLimitPerMinute: rateLimitPerMinute || 60,
        })
        .returning();
      return row;
    });

    logAudit({ tenantId, userId, action: 'developer.sdk_config.created', resourceType: 'sdk_configuration', resourceId: config.id, details: { sdkKey, environment: config.environment }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({ data: config });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'SDK configuration conflict' } });
    }
    console.error('Create SDK config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create SDK configuration' } });
  }
});

// PATCH /:id — Update SDK config
router.patch('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { allowedOrigins, enabledWidgets, themeOverrides, rateLimitPerMinute } = req.body;

    const updates: Record<string, any> = {};
    if (allowedOrigins !== undefined) updates.allowedOrigins = allowedOrigins;
    if (enabledWidgets !== undefined) updates.enabledWidgets = enabledWidgets;
    if (themeOverrides !== undefined) updates.themeOverrides = themeOverrides;
    if (rateLimitPerMinute !== undefined) updates.rateLimitPerMinute = rateLimitPerMinute;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.sdkConfigurations)
        .set(updates)
        .where(and(eq(schema.sdkConfigurations.id, id), eq(schema.sdkConfigurations.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SDK configuration not found' } });
    }

    logAudit({ tenantId, userId, action: 'developer.sdk_config.updated', resourceType: 'sdk_configuration', resourceId: id, details: { updated: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    console.error('Update SDK config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update SDK configuration' } });
  }
});

// DELETE /:id — Delete SDK config
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.delete(schema.sdkConfigurations)
        .where(and(eq(schema.sdkConfigurations.id, id), eq(schema.sdkConfigurations.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SDK configuration not found' } });
    }

    logAudit({ tenantId, userId, action: 'developer.sdk_config.deleted', resourceType: 'sdk_configuration', resourceId: id, details: { sdkKey: deleted.sdkKey }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('Delete SDK config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete SDK configuration' } });
  }
});

export default router;
