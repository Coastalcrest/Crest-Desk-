import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// ------------------------------------------------------------------ //
//  Plans (agent+ accessible)                                          //
// ------------------------------------------------------------------ //

// GET /plans — List all active subscription plans (no tenant context needed)
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await db.select().from(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.active, true))
      .orderBy(schema.subscriptionPlans.sortOrder);

    return res.json({ data: plans, total: plans.length });
  } catch (err) {
    console.error('List subscription plans error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list subscription plans' } });
  }
});

// GET /plans/:planCode — Get single plan by plan_code
router.get('/plans/:planCode', async (req: Request, res: Response) => {
  try {
    const { planCode } = req.params;

    const [plan] = await db.select().from(schema.subscriptionPlans)
      .where(and(eq(schema.subscriptionPlans.planCode, planCode), eq(schema.subscriptionPlans.active, true)));

    if (!plan) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription plan not found' } });
    }

    return res.json({ data: plan });
  } catch (err) {
    console.error('Get subscription plan error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription plan' } });
  }
});

// ------------------------------------------------------------------ //
//  Current Subscription                                               //
// ------------------------------------------------------------------ //

// GET /current — Get tenant subscription info + usage summary
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Get tenant subscription fields
      const [tenant] = await tx.select({
        subscriptionPlan: schema.tenants.subscriptionPlan,
        subscriptionStatus: schema.tenants.subscriptionStatus,
      }).from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId));

      if (!tenant) return null;

      // Get plan details if available
      let planDetails = null;
      if (tenant.subscriptionPlan) {
        const [plan] = await db.select().from(schema.subscriptionPlans)
          .where(eq(schema.subscriptionPlans.planCode, tenant.subscriptionPlan));
        planDetails = plan || null;
      }

      // Get current period usage summary
      const today = new Date().toISOString().split('T')[0];
      const currentUsage = await tx.select({
        eventType: schema.subscriptionUsage.eventType,
        count: schema.subscriptionUsage.count,
        periodStart: schema.subscriptionUsage.periodStart,
        periodEnd: schema.subscriptionUsage.periodEnd,
      }).from(schema.subscriptionUsage)
        .where(and(
          eq(schema.subscriptionUsage.tenantId, tenantId),
          lte(schema.subscriptionUsage.periodStart, today),
          gte(schema.subscriptionUsage.periodEnd, today),
        ));

      return {
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionStatus: tenant.subscriptionStatus,
        planDetails,
        currentUsage,
      };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }

    return res.json({ data: result });
  } catch (err) {
    console.error('Get current subscription error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get current subscription' } });
  }
});

// ------------------------------------------------------------------ //
//  Usage                                                              //
// ------------------------------------------------------------------ //

// GET /usage — Current period usage breakdown
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const today = new Date().toISOString().split('T')[0];

    const usage = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.subscriptionUsage)
        .where(and(
          eq(schema.subscriptionUsage.tenantId, tenantId),
          lte(schema.subscriptionUsage.periodStart, today),
          gte(schema.subscriptionUsage.periodEnd, today),
        ));
    });

    return res.json({ data: usage, total: usage.length });
  } catch (err) {
    console.error('Get usage error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage data' } });
  }
});

// GET /usage/history — Last 12 months usage grouped by period
router.get('/usage/history', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const history = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        periodStart: schema.subscriptionUsage.periodStart,
        periodEnd: schema.subscriptionUsage.periodEnd,
        eventType: schema.subscriptionUsage.eventType,
        count: schema.subscriptionUsage.count,
      }).from(schema.subscriptionUsage)
        .where(eq(schema.subscriptionUsage.tenantId, tenantId))
        .orderBy(desc(schema.subscriptionUsage.periodStart))
        .limit(12 * 10); // Up to 10 event types x 12 months
    });

    // Group by period
    const grouped: Record<string, { periodStart: string; periodEnd: string; usage: Record<string, number> }> = {};
    for (const row of history) {
      const key = String(row.periodStart);
      if (!grouped[key]) {
        grouped[key] = { periodStart: String(row.periodStart), periodEnd: String(row.periodEnd), usage: {} };
      }
      grouped[key].usage[row.eventType] = row.count;
    }

    const periods = Object.values(grouped).slice(0, 12);

    return res.json({ data: periods, total: periods.length });
  } catch (err) {
    console.error('Get usage history error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage history' } });
  }
});

// ------------------------------------------------------------------ //
//  Billing Info (owner only)                                          //
// ------------------------------------------------------------------ //

// PATCH /billing-info — Update billing_email and billing_name on tenants table
router.patch('/billing-info', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { billingEmail, billingName } = req.body;

    if (!billingEmail && !billingName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one of billingEmail or billingName is required' } });
    }

    // Store billing info in the settings JSONB field on tenants
    const updated = await withTenantContext(tenantId, async (tx) => {
      const [tenant] = await tx.select({ settings: schema.tenants.settings }).from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId));

      if (!tenant) return null;

      const currentSettings = (tenant.settings as Record<string, any>) || {};
      const newSettings = {
        ...currentSettings,
        ...(billingEmail !== undefined ? { billingEmail } : {}),
        ...(billingName !== undefined ? { billingName } : {}),
      };

      const [row] = await tx.update(schema.tenants)
        .set({ settings: newSettings })
        .where(eq(schema.tenants.id, tenantId))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    }

    logAudit({ tenantId, userId, action: 'billing.info.updated', resourceType: 'tenant', resourceId: tenantId, details: { billingEmail, billingName }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    const settings = (updated.settings as Record<string, any>) || {};
    return res.json({
      data: {
        billingEmail: settings.billingEmail || null,
        billingName: settings.billingName || null,
      },
    });
  } catch (err) {
    console.error('Update billing info error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update billing info' } });
  }
});

export default router;
