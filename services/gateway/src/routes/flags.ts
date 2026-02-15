import crypto from 'node:crypto';

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../lib/db';
import { featureFlags } from '../lib/schema';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { AppError } from '../middleware/error-handler';

// ------------------------------------------------------------------ //
//  Helper: deterministic flag evaluation                              //
// ------------------------------------------------------------------ //

function evaluateFlag(
  flag: {
    enabled: boolean | null;
    tenantOverrides: unknown;
    userOverrides: unknown;
    rolloutPercentage: number | null;
  },
  flagKey: string,
  userId: string,
  tenantId: string,
): boolean {
  // 1. User override
  const userOverrides = (flag.userOverrides ?? {}) as Record<string, boolean>;
  if (userId in userOverrides) return userOverrides[userId];

  // 2. Tenant override
  const tenantOverrides = (flag.tenantOverrides ?? {}) as Record<string, boolean>;
  if (tenantId in tenantOverrides) return tenantOverrides[tenantId];

  // 3. Rollout percentage (deterministic hash)
  const rollout = flag.rolloutPercentage ?? 0;
  if (rollout > 0 && rollout < 100) {
    const hash = crypto.createHash('md5').update(`${userId}:${flagKey}`).digest();
    const bucket = hash.readUInt16BE(0) % 100;
    return bucket < rollout;
  }

  // 4. Global toggle
  return flag.enabled ?? false;
}

// ------------------------------------------------------------------ //
//  Validation schemas                                                 //
// ------------------------------------------------------------------ //

const updateFlagSchema = z.object({
  enabled: z.boolean().optional(),
  tenantOverrides: z.record(z.string(), z.boolean()).optional(),
  userOverrides: z.record(z.string(), z.boolean()).optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  description: z.string().optional(),
});

// ------------------------------------------------------------------ //
//  Router                                                             //
// ------------------------------------------------------------------ //

const router = Router();

// All feature flag routes require authentication.
router.use(authenticate);

// ------------------------------------------------------------------ //
//  GET /api/v1/flags                                                  //
// ------------------------------------------------------------------ //
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;

    const flags = await db.select().from(featureFlags);

    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = evaluateFlag(flag, flag.key, userId, tenantId);
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  GET /api/v1/flags/:key                                             //
// ------------------------------------------------------------------ //
router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const { key } = req.params;

    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key));

    if (!flag) {
      throw new AppError(404, 'NOT_FOUND', `Feature flag "${key}" not found`);
    }

    const enabled = evaluateFlag(flag, flag.key, userId, tenantId);

    res.json({
      data: {
        key: flag.key,
        enabled,
        description: flag.description,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------------ //
//  PUT /api/v1/flags/:key                                             //
// ------------------------------------------------------------------ //
router.put(
  '/:key',
  requireRole('owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId } = req.user!;
      const { key } = req.params;

      const body = updateFlagSchema.parse(req.body);

      // Verify the flag exists before updating.
      const [existing] = await db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.key, key));

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', `Feature flag "${key}" not found`);
      }

      const [updated] = await db
        .update(featureFlags)
        .set({
          ...(body.enabled !== undefined && { enabled: body.enabled }),
          ...(body.tenantOverrides !== undefined && { tenantOverrides: body.tenantOverrides }),
          ...(body.userOverrides !== undefined && { userOverrides: body.userOverrides }),
          ...(body.rolloutPercentage !== undefined && { rolloutPercentage: body.rolloutPercentage }),
          ...(body.description !== undefined && { description: body.description }),
          updatedAt: new Date(),
        })
        .where(eq(featureFlags.key, key))
        .returning();

      logAudit({
        tenantId,
        userId,
        action: 'feature_flag.updated',
        resourceType: 'feature_flag',
        resourceId: updated.id,
        details: { key, changes: body },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
