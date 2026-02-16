import { Router, Request, Response } from 'express';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();
router.use(requireAuth);

// GET / — List API keys (masked, never return full key or hash)
router.get('/', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const keys = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        scopes: schema.apiKeys.scopes,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        expiresAt: schema.apiKeys.expiresAt,
        revokedAt: schema.apiKeys.revokedAt,
        createdAt: schema.apiKeys.createdAt,
      }).from(schema.apiKeys)
        .where(eq(schema.apiKeys.tenantId, tenantId))
        .orderBy(desc(schema.apiKeys.createdAt));
    });
    return res.json({ data: keys, total: keys.length });
  } catch (err) {
    console.error('List API keys error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' } });
  }
});

// POST / — Create new API key (return full key ONCE)
router.post('/', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { name, scopes, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    }

    // Generate key: sk_live_ + 32 random hex bytes
    const rawKey = `sk_live_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const entry = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.insert(schema.apiKeys)
        .values({
          tenantId,
          name,
          keyPrefix,
          keyHash,
          scopes: scopes || [],
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: userId,
        })
        .returning();
      return row;
    });

    logAudit({ tenantId, userId, action: 'developer.api_key.created', resourceType: 'api_key', resourceId: entry.id, details: { name, keyPrefix }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    // Return key only once — include the raw key in response
    return res.status(201).json({
      data: {
        id: entry.id,
        name: entry.name,
        keyPrefix: entry.keyPrefix,
        key: rawKey, // Only returned on creation!
        scopes: entry.scopes,
        expiresAt: entry.expiresAt,
        createdAt: entry.createdAt,
      },
    });
  } catch (err) {
    console.error('Create API key error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
  }
});

// GET /:id — Get single API key detail (masked)
router.get('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const key = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        scopes: schema.apiKeys.scopes,
        lastUsedAt: schema.apiKeys.lastUsedAt,
        expiresAt: schema.apiKeys.expiresAt,
        revokedAt: schema.apiKeys.revokedAt,
        createdAt: schema.apiKeys.createdAt,
        updatedAt: schema.apiKeys.updatedAt,
      }).from(schema.apiKeys)
        .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.tenantId, tenantId)));
      return row;
    });

    if (!key) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    return res.json({ data: key });
  } catch (err) {
    console.error('Get API key error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get API key' } });
  }
});

// PATCH /:id — Update name, scopes, expires_at
router.patch('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { name, scopes, expiresAt } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (scopes !== undefined) updates.scopes = scopes;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const updated = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.apiKeys)
        .set(updates)
        .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.tenantId, tenantId)))
        .returning();
      return row;
    });

    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    logAudit({ tenantId, userId, action: 'developer.api_key.updated', resourceType: 'api_key', resourceId: id, details: { updated: Object.keys(updates) }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { id: updated.id, name: updated.name, keyPrefix: updated.keyPrefix, scopes: updated.scopes, expiresAt: updated.expiresAt } });
  } catch (err) {
    console.error('Update API key error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update API key' } });
  }
});

// DELETE /:id — Revoke API key (soft: set revoked_at)
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const revoked = await withTenantContext(tenantId, async (tx) => {
      const [row] = await tx.update(schema.apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.tenantId, tenantId), isNull(schema.apiKeys.revokedAt)))
        .returning();
      return row;
    });

    if (!revoked) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found or already revoked' } });
    }

    logAudit({ tenantId, userId, action: 'developer.api_key.revoked', resourceType: 'api_key', resourceId: id, details: { keyPrefix: revoked.keyPrefix }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { revoked: true } });
  } catch (err) {
    console.error('Revoke API key error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } });
  }
});

export default router;
