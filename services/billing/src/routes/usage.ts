/**
 * Usage metering routes for tracking subscription usage.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

// In-memory usage store (replace with database in production)
const usageStore = new Map<string, Map<string, number>>();

const recordUsageSchema = z.object({
  tenantId: z.string().uuid(),
  eventType: z.string().min(1),
  count: z.number().int().positive().default(1),
});

const getUsageSchema = z.object({
  tenantId: z.string().uuid(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

/**
 * POST /usage/record — Record a usage event.
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const body = recordUsageSchema.parse(req.body);
    const key = `${body.tenantId}:${body.eventType}`;

    const current = usageStore.get(body.tenantId) ?? new Map<string, number>();
    current.set(body.eventType, (current.get(body.eventType) ?? 0) + body.count);
    usageStore.set(body.tenantId, current);

    logger.info({ tenantId: body.tenantId, eventType: body.eventType, count: body.count }, 'Usage recorded');

    res.status(201).json({
      data: {
        tenantId: body.tenantId,
        eventType: body.eventType,
        currentCount: current.get(body.eventType),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: err.errors } });
    }
    logger.error({ err }, 'Record usage failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record usage' } });
  }
});

/**
 * GET /usage/:tenantId — Get usage summary for a tenant.
 */
router.get('/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const usage = usageStore.get(tenantId);

    if (!usage) {
      return res.json({ data: { tenantId, events: {}, total: 0 } });
    }

    const events: Record<string, number> = {};
    let total = 0;
    for (const [eventType, count] of usage.entries()) {
      events[eventType] = count;
      total += count;
    }

    res.json({ data: { tenantId, events, total } });
  } catch (err) {
    logger.error({ err }, 'Get usage failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get usage' } });
  }
});

/**
 * DELETE /usage/:tenantId — Reset usage for a tenant (period rollover).
 */
router.delete('/:tenantId', async (req: Request, res: Response) => {
  try {
    usageStore.delete(req.params.tenantId);
    logger.info({ tenantId: req.params.tenantId }, 'Usage reset');
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Reset usage failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reset usage' } });
  }
});

export default router;
