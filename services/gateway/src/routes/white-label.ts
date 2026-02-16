import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

const WHITE_LABEL_DEFAULTS = {
  customDomain: null,
  customDomainVerified: false,
  customDomainVerifiedAt: null,
  emailFromName: null,
  emailFromDomain: null,
  emailReplyTo: null,
  customCss: null,
  loginPageHtml: null,
  faviconUrl: null,
  poweredByVisible: true,
  embedEnabled: false,
  embedAllowedOrigins: [],
  sdkEnabled: false,
};

const ALLOWED_CONFIG_FIELDS = [
  'customDomain', 'emailFromName', 'emailFromDomain', 'emailReplyTo',
  'customCss', 'loginPageHtml', 'faviconUrl', 'poweredByVisible',
  'embedEnabled', 'embedAllowedOrigins', 'sdkEnabled',
];

// ------------------------------------------------------------------ //
//  Config routes (owner only)                                         //
// ------------------------------------------------------------------ //

// GET /config — Get white-label config (upsert pattern: defaults if none)
router.get('/config', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const config = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));
      return row;
    });

    if (!config) {
      return res.json({ data: { tenantId, ...WHITE_LABEL_DEFAULTS } });
    }

    return res.json({ data: config });
  } catch (err) {
    console.error('Get white-label config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get white-label config' } });
  }
});

// PATCH /config — Update white-label fields
router.patch('/config', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const updates = req.body;

    const sanitized: Record<string, any> = {};
    for (const key of ALLOWED_CONFIG_FIELDS) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      const [existing] = await tx.select({ id: schema.whiteLabelConfigs.id })
        .from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));

      if (existing) {
        const [row] = await tx.update(schema.whiteLabelConfigs)
          .set(sanitized)
          .where(eq(schema.whiteLabelConfigs.tenantId, tenantId))
          .returning();
        return row;
      } else {
        const [row] = await tx.insert(schema.whiteLabelConfigs)
          .values({ tenantId, ...sanitized })
          .returning();
        return row;
      }
    });

    logAudit({ tenantId, userId, action: 'white_label.config.updated', resourceType: 'white_label_config', details: { updated: Object.keys(sanitized) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: result });
  } catch (err) {
    console.error('Update white-label config error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update white-label config' } });
  }
});

// ------------------------------------------------------------------ //
//  Custom Domain                                                      //
// ------------------------------------------------------------------ //

// POST /custom-domain — Set custom domain, mark pending verification
router.post('/custom-domain', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { customDomain } = req.body;

    if (!customDomain) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'customDomain is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Upsert white_label_configs
      const [existing] = await tx.select({ id: schema.whiteLabelConfigs.id })
        .from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));

      let config;
      if (existing) {
        const [row] = await tx.update(schema.whiteLabelConfigs)
          .set({ customDomain, customDomainVerified: false, customDomainVerifiedAt: null })
          .where(eq(schema.whiteLabelConfigs.tenantId, tenantId))
          .returning();
        config = row;
      } else {
        const [row] = await tx.insert(schema.whiteLabelConfigs)
          .values({ tenantId, customDomain, customDomainVerified: false })
          .returning();
        config = row;
      }

      // Also update tenants settings with custom domain reference
      const [tenant] = await tx.select({ settings: schema.tenants.settings }).from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId));

      const currentSettings = (tenant?.settings as Record<string, any>) || {};
      await tx.update(schema.tenants)
        .set({ settings: { ...currentSettings, customDomain } })
        .where(eq(schema.tenants.id, tenantId));

      return config;
    });

    logAudit({ tenantId, userId, action: 'white_label.custom_domain.set', resourceType: 'white_label_config', details: { customDomain }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({
      data: {
        customDomain: result.customDomain,
        customDomainVerified: result.customDomainVerified,
        verificationStatus: 'pending',
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'This custom domain is already in use' } });
    }
    console.error('Set custom domain error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to set custom domain' } });
  }
});

// POST /custom-domain/verify — DNS verification (placeholder: sets verified=true)
router.post('/custom-domain/verify', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [config] = await tx.select().from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));

      if (!config || !config.customDomain) {
        return null;
      }

      const [updated] = await tx.update(schema.whiteLabelConfigs)
        .set({ customDomainVerified: true, customDomainVerifiedAt: new Date() })
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId))
        .returning();

      return updated;
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No custom domain configured' } });
    }

    logAudit({ tenantId, userId, action: 'white_label.custom_domain.verified', resourceType: 'white_label_config', details: { customDomain: result.customDomain }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({
      data: {
        customDomain: result.customDomain,
        customDomainVerified: result.customDomainVerified,
        customDomainVerifiedAt: result.customDomainVerifiedAt,
      },
    });
  } catch (err) {
    console.error('Verify custom domain error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to verify custom domain' } });
  }
});

// DELETE /custom-domain — Remove custom domain, reset verification
router.delete('/custom-domain', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [config] = await tx.select().from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));

      if (!config || !config.customDomain) {
        return null;
      }

      const previousDomain = config.customDomain;

      const [updated] = await tx.update(schema.whiteLabelConfigs)
        .set({ customDomain: null, customDomainVerified: false, customDomainVerifiedAt: null })
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId))
        .returning();

      // Remove from tenants settings
      const [tenant] = await tx.select({ settings: schema.tenants.settings }).from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId));
      const currentSettings = (tenant?.settings as Record<string, any>) || {};
      const { customDomain: _removed, ...remainingSettings } = currentSettings;
      await tx.update(schema.tenants)
        .set({ settings: remainingSettings })
        .where(eq(schema.tenants.id, tenantId));

      return { updated, previousDomain };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No custom domain configured' } });
    }

    logAudit({ tenantId, userId, action: 'white_label.custom_domain.removed', resourceType: 'white_label_config', details: { previousDomain: result.previousDomain }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { removed: true } });
  } catch (err) {
    console.error('Remove custom domain error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove custom domain' } });
  }
});

// ------------------------------------------------------------------ //
//  Embed Settings                                                     //
// ------------------------------------------------------------------ //

// GET /embed-settings — Return embed-specific fields
router.get('/embed-settings', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const config = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select({
        embedEnabled: schema.whiteLabelConfigs.embedEnabled,
        embedAllowedOrigins: schema.whiteLabelConfigs.embedAllowedOrigins,
      }).from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));
      return row;
    });

    if (!config) {
      return res.json({ data: { embedEnabled: false, embedAllowedOrigins: [] } });
    }

    return res.json({ data: config });
  } catch (err) {
    console.error('Get embed settings error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get embed settings' } });
  }
});

// PATCH /embed-settings — Update embed fields
router.patch('/embed-settings', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { embedEnabled, embedAllowedOrigins } = req.body;

    const updates: Record<string, any> = {};
    if (embedEnabled !== undefined) updates.embedEnabled = embedEnabled;
    if (embedAllowedOrigins !== undefined) updates.embedAllowedOrigins = embedAllowedOrigins;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      const [existing] = await tx.select({ id: schema.whiteLabelConfigs.id })
        .from(schema.whiteLabelConfigs)
        .where(eq(schema.whiteLabelConfigs.tenantId, tenantId));

      if (existing) {
        const [row] = await tx.update(schema.whiteLabelConfigs)
          .set(updates)
          .where(eq(schema.whiteLabelConfigs.tenantId, tenantId))
          .returning();
        return row;
      } else {
        const [row] = await tx.insert(schema.whiteLabelConfigs)
          .values({ tenantId, ...updates })
          .returning();
        return row;
      }
    });

    logAudit({ tenantId, userId, action: 'white_label.embed.updated', resourceType: 'white_label_config', details: { updated: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({
      data: {
        embedEnabled: result.embedEnabled,
        embedAllowedOrigins: result.embedAllowedOrigins,
      },
    });
  } catch (err) {
    console.error('Update embed settings error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update embed settings' } });
  }
});

export default router;
