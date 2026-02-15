import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { tenants, complianceRules, tenantComplianceRules } from '../lib/schema';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/error-handler';
import { z } from 'zod';
import { eq, and, or, inArray, isNull } from 'drizzle-orm';

const router = Router();

// All tenant routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  Helpers                                                            //
// ------------------------------------------------------------------ //

function sanitizeTenant(tenant: any) {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    primaryState: tenant.primaryState,
    licensedStates: tenant.licensedStates,
    licenseNumbers: tenant.licenseNumbers,
    branding: tenant.branding,
    settings: tenant.settings,
    subscriptionPlan: tenant.subscriptionPlan,
    subscriptionStatus: tenant.subscriptionStatus,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}

// ------------------------------------------------------------------ //
//  GET /api/v1/tenant                                                 //
// ------------------------------------------------------------------ //
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
    }

    res.json({ data: sanitizeTenant(tenant) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/tenant                                               //
// ------------------------------------------------------------------ //
const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  licensedStates: z.array(z.string().length(2)).optional(),
  licenseNumbers: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

router.patch('/', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const body = updateTenantSchema.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.licensedStates !== undefined) updates.licensedStates = body.licensedStates;
    if (body.licenseNumbers !== undefined) updates.licenseNumbers = body.licenseNumbers;
    if (body.settings !== undefined) updates.settings = body.settings;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'No fields to update');
    }

    // Fetch before snapshot for audit
    const [before] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!before) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, tenantId))
      .returning();

    logAudit({
      tenantId,
      userId: req.user!.userId,
      action: 'tenant.settings.updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      details: {
        before: sanitizeTenant(before),
        after: sanitizeTenant(updated),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: sanitizeTenant(updated) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PATCH /api/v1/tenant/branding                                      //
// ------------------------------------------------------------------ //
const updateBrandingSchema = z.object({
  logoUrl: z.string().url().max(500).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  fonts: z.record(z.unknown()).optional(),
});

router.patch('/branding', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const body = updateBrandingSchema.parse(req.body);

    // Fetch current tenant to merge branding
    const [current] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!current) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
    }

    const existingBranding = (current.branding as Record<string, unknown>) ?? {};

    // Merge new branding fields with existing
    const mergedBranding: Record<string, unknown> = { ...existingBranding };
    if (body.logoUrl !== undefined) mergedBranding.logoUrl = body.logoUrl;
    if (body.primaryColor !== undefined) mergedBranding.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) mergedBranding.secondaryColor = body.secondaryColor;
    if (body.fonts !== undefined) mergedBranding.fonts = body.fonts;

    const [updated] = await db
      .update(tenants)
      .set({ branding: mergedBranding, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();

    logAudit({
      tenantId,
      userId: req.user!.userId,
      action: 'tenant.branding.updated',
      resourceType: 'tenant',
      resourceId: tenantId,
      details: {
        before: { branding: existingBranding },
        after: { branding: mergedBranding },
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ data: sanitizeTenant(updated) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/tenant/compliance                                      //
// ------------------------------------------------------------------ //
router.get('/compliance', requireRole('principal_broker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;

    // Load tenant to get licensed states
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found');
    }

    const licensedStates = (tenant.licensedStates as string[]) ?? [];

    // Build jurisdictions list: federal + each licensed state
    const jurisdictions = ['federal', ...licensedStates];

    // Load compliance rules for the tenant's jurisdictions
    const federalAndStateRules = jurisdictions.length > 0
      ? await db
          .select()
          .from(complianceRules)
          .where(inArray(complianceRules.jurisdiction, jurisdictions))
      : [];

    // Load tenant-specific custom compliance rules
    const customRules = await db
      .select()
      .from(tenantComplianceRules)
      .where(eq(tenantComplianceRules.tenantId, tenantId));

    // Separate federal vs state rules
    const federal = federalAndStateRules.filter((r) => r.jurisdiction === 'federal');
    const state = federalAndStateRules.filter((r) => r.jurisdiction !== 'federal');

    res.json({
      data: {
        federal,
        state,
        custom: customRules,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  POST /api/v1/tenant/compliance/rules                               //
// ------------------------------------------------------------------ //
const createComplianceRuleSchema = z.object({
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  enforcement: z.enum(['required', 'recommended', 'optional', 'informational']),
  appliesTo: z.array(z.string()).min(1),
  parameters: z.record(z.unknown()).optional(),
});

router.post('/compliance/rules', requireRole('principal_broker'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const body = createComplianceRuleSchema.parse(req.body);

    const [created] = await db
      .insert(tenantComplianceRules)
      .values({
        tenantId,
        category: body.category,
        title: body.title,
        description: body.description,
        enforcement: body.enforcement,
        appliesTo: body.appliesTo,
        parameters: body.parameters ?? {},
        createdBy: userId,
      })
      .returning();

    logAudit({
      tenantId,
      userId,
      action: 'compliance.rule.created',
      resourceType: 'tenant_compliance_rule',
      resourceId: created.id,
      details: {
        category: body.category,
        title: body.title,
        enforcement: body.enforcement,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
