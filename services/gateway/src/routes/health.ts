/**
 * Health check routes with varying depth.
 *
 * /health       — Basic liveness (always 200)
 * /health/live  — Kubernetes liveness probe
 * /health/ready — Kubernetes readiness probe (checks DB + Redis)
 */
import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db';
import redis from '../lib/redis';
import { logger } from '../lib/logger';

const router = Router();

// Basic health — always responds (liveness)
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    version: process.env.npm_package_version ?? '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Kubernetes liveness probe — lightweight
router.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

// Kubernetes readiness probe — checks dependencies
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let allHealthy = true;

  // Check PostgreSQL
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err instanceof Error ? err.message : 'Unknown error' };
    allHealthy = false;
    logger.warn({ err }, 'Health check: database unhealthy');
  }

  // Check Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err instanceof Error ? err.message : 'Unknown error' };
    allHealthy = false;
    logger.warn({ err }, 'Health check: redis unhealthy');
  }

  const status = allHealthy ? 'ready' : 'degraded';
  const httpStatus = allHealthy ? 200 : 503;

  res.status(httpStatus).json({
    status,
    service: 'gateway',
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  });
});

export default router;
