import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { authLimiter } from '../middleware/rate-limiter';
import { logger } from '../lib/logger';

const router = Router();

// ------------------------------------------------------------------ //
//  Public endpoints                                                   //
// ------------------------------------------------------------------ //

// POST /signup — Public tenant signup (rate-limited, no auth)
router.post('/signup', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, brokerageName, primaryState } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email, password, and name are required' } });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
    }

    if (!primaryState || primaryState.length !== 2) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'primaryState is required (2-letter state code)' } });
    }

    const passwordHash = await hash(password);

    // Generate a slug from brokerage name or email
    const slugBase = (brokerageName || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // Split name into first/last
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const result = await db.transaction(async (tx) => {
      // 1. Create tenant
      const [tenant] = await tx.insert(schema.tenants)
        .values({
          name: brokerageName || name,
          slug,
          primaryState: primaryState.toUpperCase(),
          subscriptionPlan: 'trial',
          subscriptionStatus: 'active',
        })
        .returning();

      // 2. Create owner user
      const [user] = await tx.insert(schema.users)
        .values({
          tenantId: tenant.id,
          email: email.toLowerCase().trim(),
          passwordHash,
          role: 'owner',
          firstName,
          lastName,
          emailVerified: false,
          onboardingCompleted: false,
          onboardingStep: 0,
        })
        .returning();

      // 3. Update tenant owner reference
      await tx.update(schema.tenants)
        .set({ ownerUserId: user.id })
        .where(eq(schema.tenants.id, tenant.id));

      // 4. Create onboarding row
      const [onboarding] = await tx.insert(schema.tenantOnboarding)
        .values({
          tenantId: tenant.id,
          currentStep: 'account_created',
          stepsCompleted: ['account_created'],
          brokerageName: brokerageName || null,
          primaryState: primaryState.toUpperCase(),
        })
        .returning();

      return { tenant, user, onboarding };
    });

    logAudit({ tenantId: result.tenant.id, userId: result.user.id, action: 'onboarding.signup.completed', resourceType: 'tenant', resourceId: result.tenant.id, details: { email, brokerageName, primaryState }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({
      data: {
        tenantId: result.tenant.id,
        userId: result.user.id,
        email: result.user.email,
        onboardingStep: result.onboarding.currentStep,
      },
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } });
    }
    logger.error({ err }, 'Signup error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' } });
  }
});

// ------------------------------------------------------------------ //
//  Authenticated endpoints (owner only)                               //
// ------------------------------------------------------------------ //

router.use(requireAuth);

// GET /status — Get onboarding progress
router.get('/status', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const onboarding = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select().from(schema.tenantOnboarding)
        .where(eq(schema.tenantOnboarding.tenantId, tenantId));
      return row;
    });

    if (!onboarding) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Onboarding record not found' } });
    }

    return res.json({ data: onboarding });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get onboarding status error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get onboarding status' } });
  }
});

// PATCH /step — Complete an onboarding step
router.patch('/step', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { step } = req.body;

    if (!step) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'step is required' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [existing] = await tx.select().from(schema.tenantOnboarding)
        .where(eq(schema.tenantOnboarding.tenantId, tenantId));

      if (!existing) return null;

      // Add step to completed array if not already present
      const stepsCompleted = existing.stepsCompleted || [];
      if (!stepsCompleted.includes(step)) {
        stepsCompleted.push(step);
      }

      const [row] = await tx.update(schema.tenantOnboarding)
        .set({
          currentStep: step,
          stepsCompleted,
        })
        .where(eq(schema.tenantOnboarding.tenantId, tenantId))
        .returning();

      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Onboarding record not found' } });
    }

    logAudit({ tenantId, userId, action: 'onboarding.step.completed', resourceType: 'tenant_onboarding', details: { step }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: updated });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update onboarding step error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update onboarding step' } });
  }
});

// POST /complete — Mark onboarding complete
router.post('/complete', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Update onboarding record
      const [onboarding] = await tx.update(schema.tenantOnboarding)
        .set({ onboardingCompletedAt: new Date(), currentStep: 'completed' })
        .where(eq(schema.tenantOnboarding.tenantId, tenantId))
        .returning();

      if (!onboarding) return null;

      // Update user onboarding flag
      await tx.update(schema.users)
        .set({ onboardingCompleted: true })
        .where(eq(schema.users.id, userId));

      return onboarding;
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Onboarding record not found' } });
    }

    logAudit({ tenantId, userId, action: 'onboarding.completed', resourceType: 'tenant_onboarding', details: { completedAt: result.onboardingCompletedAt }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { completed: true, completedAt: result.onboardingCompletedAt } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Complete onboarding error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding' } });
  }
});

export default router;
