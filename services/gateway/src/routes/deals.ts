import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const ROLE_LEVEL: Record<string, number> = { agent: 0, managing_broker: 1, principal_broker: 2, owner: 3 };
function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/deals — List deals (pipeline view) ---------- //
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const stageId = req.query.stageId as string;
    const ownerId = req.query.ownerId as string;
    const contactId = req.query.contactId as string;
    const dealType = req.query.dealType as string;

    const conditions = [
      eq(schema.deals.tenantId, tenantId),
      isNull(schema.deals.deletedAt),
    ];

    if (stageId) {
      conditions.push(eq(schema.deals.pipelineStageId, stageId));
    }
    if (ownerId) {
      conditions.push(eq(schema.deals.ownerUserId, ownerId));
    }
    if (contactId) {
      conditions.push(eq(schema.deals.contactId, contactId));
    }
    if (dealType) {
      conditions.push(eq(schema.deals.dealType, dealType));
    }

    const [deals, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.deals.id,
          tenantId: schema.deals.tenantId,
          contactId: schema.deals.contactId,
          ownerUserId: schema.deals.ownerUserId,
          pipelineStageId: schema.deals.pipelineStageId,
          dealName: schema.deals.dealName,
          dealValue: schema.deals.dealValue,
          expectedCloseDate: schema.deals.expectedCloseDate,
          probability: schema.deals.probability,
          dealType: schema.deals.dealType,
          propertyAddress: schema.deals.propertyAddress,
          propertyState: schema.deals.propertyState,
          wonAt: schema.deals.wonAt,
          lostAt: schema.deals.lostAt,
          createdAt: schema.deals.createdAt,
          contactFirstName: schema.contacts.firstName,
          contactLastName: schema.contacts.lastName,
          contactEmail: schema.contacts.email,
          stageName: schema.pipelineStages.stageName,
          stageColor: schema.pipelineStages.stageColor,
          stageOrder: schema.pipelineStages.stageOrder,
        })
        .from(schema.deals)
        .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
        .leftJoin(schema.pipelineStages, eq(schema.deals.pipelineStageId, schema.pipelineStages.id))
        .where(and(...conditions))
        .orderBy(asc(schema.pipelineStages.stageOrder), desc(schema.deals.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.deals)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({
      data: deals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('List deals error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list deals' } });
  }
});

// ---------- GET /api/v1/deals/stats — Pipeline stats ---------- //
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await withTenantContext(tenantId, async (tx) => {
      // Overall deal stats
      const [overview] = await tx
        .select({
          totalDeals: sql<number>`count(*)::int`,
          totalValue: sql<string>`coalesce(sum(${schema.deals.dealValue}), 0)::text`,
          wonThisMonth: sql<number>`count(*) filter (where ${schema.deals.wonAt} >= ${startOfMonth})::int`,
          lostThisMonth: sql<number>`count(*) filter (where ${schema.deals.lostAt} >= ${startOfMonth})::int`,
          forecast: sql<string>`coalesce(sum(
            case when ${schema.deals.wonAt} is null and ${schema.deals.lostAt} is null
              then (${schema.deals.dealValue}::numeric * coalesce(${schema.deals.probability}, 50) / 100)
              else 0
            end
          ), 0)::text`,
        })
        .from(schema.deals)
        .where(and(
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      // By-stage breakdown
      const byStage = await tx
        .select({
          stageId: schema.pipelineStages.id,
          stageName: schema.pipelineStages.stageName,
          stageColor: schema.pipelineStages.stageColor,
          stageOrder: schema.pipelineStages.stageOrder,
          dealCount: sql<number>`count(${schema.deals.id})::int`,
          stageValue: sql<string>`coalesce(sum(${schema.deals.dealValue}), 0)::text`,
        })
        .from(schema.pipelineStages)
        .leftJoin(
          schema.deals,
          and(
            eq(schema.deals.pipelineStageId, schema.pipelineStages.id),
            isNull(schema.deals.deletedAt),
          ),
        )
        .where(eq(schema.pipelineStages.tenantId, tenantId))
        .groupBy(
          schema.pipelineStages.id,
          schema.pipelineStages.stageName,
          schema.pipelineStages.stageColor,
          schema.pipelineStages.stageOrder,
        )
        .orderBy(asc(schema.pipelineStages.stageOrder));

      return { ...overview, byStage };
    });

    return res.json({ data: stats });
  } catch (err) {
    console.error('Deal stats error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get deal stats' } });
  }
});

// ---------- GET /api/v1/deals/stages — List pipeline stages ---------- //
router.get('/stages', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stages = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.pipelineStages)
        .where(eq(schema.pipelineStages.tenantId, tenantId))
        .orderBy(asc(schema.pipelineStages.stageOrder));
    });

    return res.json({ data: stages });
  } catch (err) {
    console.error('List stages error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list pipeline stages' } });
  }
});

// ---------- POST /api/v1/deals/stages — Create custom pipeline stage (Managing Broker+) ---------- //
router.post('/stages', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { stageName, stageOrder, stageColor } = req.body;

    if (!stageName || stageOrder === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'stageName and stageOrder are required' } });
    }

    const [stage] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.pipelineStages).values({
        tenantId,
        stageName,
        stageOrder,
        stageColor: stageColor || '#6B7280',
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'pipeline_stage.create',
      resourceType: 'pipeline_stage',
      resourceId: stage.id,
      details: { stageName, stageOrder },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(stage);
  } catch (err) {
    console.error('Create stage error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create pipeline stage' } });
  }
});

// ---------- POST /api/v1/deals — Create deal ---------- //
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      contactId, dealName, dealValue,
      expectedCloseDate, probability, dealType,
      propertyAddress, propertyState, pipelineStageId,
      notes,
    } = req.body;

    if (!contactId || !dealName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'contactId and dealName are required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify contact exists
      const [contact] = await tx.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, contactId),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!contact) return { error: 'CONTACT_NOT_FOUND' };

      // Determine pipeline stage: use provided or auto-assign first stage
      let stageId = pipelineStageId;
      if (!stageId) {
        const [firstStage] = await tx.select({ id: schema.pipelineStages.id })
          .from(schema.pipelineStages)
          .where(eq(schema.pipelineStages.tenantId, tenantId))
          .orderBy(asc(schema.pipelineStages.stageOrder))
          .limit(1);

        if (!firstStage) {
          return { error: 'NO_PIPELINE_STAGES' };
        }
        stageId = firstStage.id;
      }

      const [deal] = await tx.insert(schema.deals).values({
        tenantId,
        contactId,
        ownerUserId: userId,
        pipelineStageId: stageId,
        dealName,
        dealValue: dealValue?.toString() || null,
        expectedCloseDate: expectedCloseDate || null,
        probability: probability ?? 50,
        dealType: dealType || null,
        propertyAddress: propertyAddress || null,
        propertyState: propertyState ? propertyState.toUpperCase() : null,
        notes: notes || null,
      }).returning();

      return { deal };
    });

    if ('error' in result) {
      if (result.error === 'CONTACT_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
      }
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No pipeline stages configured. Create stages first.' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'deal.create',
      resourceType: 'deal',
      resourceId: result.deal.id,
      details: { dealName, contactId, dealValue },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(result.deal);
  } catch (err) {
    console.error('Create deal error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create deal' } });
  }
});

// ---------- GET /api/v1/deals/:id — Get deal detail ---------- //
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [deal] = await tx
        .select({
          id: schema.deals.id,
          tenantId: schema.deals.tenantId,
          contactId: schema.deals.contactId,
          transactionId: schema.deals.transactionId,
          ownerUserId: schema.deals.ownerUserId,
          pipelineStageId: schema.deals.pipelineStageId,
          dealName: schema.deals.dealName,
          dealValue: schema.deals.dealValue,
          expectedCloseDate: schema.deals.expectedCloseDate,
          probability: schema.deals.probability,
          dealType: schema.deals.dealType,
          propertyAddress: schema.deals.propertyAddress,
          propertyState: schema.deals.propertyState,
          notes: schema.deals.notes,
          lostReason: schema.deals.lostReason,
          wonAt: schema.deals.wonAt,
          lostAt: schema.deals.lostAt,
          createdAt: schema.deals.createdAt,
          updatedAt: schema.deals.updatedAt,
          contactFirstName: schema.contacts.firstName,
          contactLastName: schema.contacts.lastName,
          contactEmail: schema.contacts.email,
          contactPhone: schema.contacts.phone,
          stageName: schema.pipelineStages.stageName,
          stageColor: schema.pipelineStages.stageColor,
          stageOrder: schema.pipelineStages.stageOrder,
          isClosedWon: schema.pipelineStages.isClosedWon,
          isClosedLost: schema.pipelineStages.isClosedLost,
        })
        .from(schema.deals)
        .leftJoin(schema.contacts, eq(schema.deals.contactId, schema.contacts.id))
        .leftJoin(schema.pipelineStages, eq(schema.deals.pipelineStageId, schema.pipelineStages.id))
        .where(and(
          eq(schema.deals.id, id),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (!deal) return null;

      // Get activities for the linked contact
      const activities = await tx.select().from(schema.contactActivities)
        .where(and(
          eq(schema.contactActivities.contactId, deal.contactId),
          eq(schema.contactActivities.tenantId, tenantId),
        ))
        .orderBy(desc(schema.contactActivities.createdAt))
        .limit(20);

      return { ...deal, activities };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    }

    return res.json(result);
  } catch (err) {
    console.error('Get deal error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get deal' } });
  }
});

// ---------- PATCH /api/v1/deals/:id — Update deal ---------- //
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      'dealName', 'dealValue', 'expectedCloseDate', 'probability',
      'dealType', 'propertyAddress', 'propertyState',
      'pipelineStageId', 'notes', 'lostReason', 'ownerUserId',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'dealValue') {
          updates[field] = req.body[field]?.toString() || null;
        } else if (field === 'propertyState') {
          updates[field] = req.body[field] ? req.body[field].toUpperCase() : null;
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // If stage is being changed, check for won/lost logic
      if (updates.pipelineStageId) {
        const [newStage] = await tx.select()
          .from(schema.pipelineStages)
          .where(and(
            eq(schema.pipelineStages.id, updates.pipelineStageId as string),
            eq(schema.pipelineStages.tenantId, tenantId),
          ));

        if (!newStage) {
          return { error: 'STAGE_NOT_FOUND' };
        }

        if (newStage.isClosedWon) {
          updates.wonAt = new Date();
        }
        if (newStage.isClosedLost) {
          updates.lostAt = new Date();
        }

        // If moving to closedWon, update contact type to past_client
        if (newStage.isClosedWon) {
          // Get the deal's contactId first
          const [currentDeal] = await tx.select({ contactId: schema.deals.contactId })
            .from(schema.deals)
            .where(and(
              eq(schema.deals.id, id),
              eq(schema.deals.tenantId, tenantId),
              isNull(schema.deals.deletedAt),
            ));

          if (currentDeal) {
            await tx.update(schema.contacts)
              .set({ contactType: 'past_client', updatedAt: new Date() })
              .where(eq(schema.contacts.id, currentDeal.contactId));
          }
        }
      }

      const [deal] = await tx.update(schema.deals)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.deals.id, id),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ))
        .returning();

      if (!deal) return { error: 'NOT_FOUND' };

      return { deal };
    });

    if ('error' in result) {
      if (result.error === 'STAGE_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pipeline stage not found' } });
      }
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'deal.update',
      resourceType: 'deal',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(result.deal);
  } catch (err) {
    console.error('Update deal error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update deal' } });
  }
});

// ---------- DELETE /api/v1/deals/:id — Soft delete deal ---------- //
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [deal] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.deals)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.deals.id, id),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ))
        .returning();
    });

    if (!deal) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'deal.delete',
      resourceType: 'deal',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Delete deal error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete deal' } });
  }
});

// ---------- PATCH /api/v1/deals/:id/stage — Move deal to new stage (drag-and-drop) ---------- //
router.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'stageId is required' } });
    }

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify stage exists
      const [newStage] = await tx.select()
        .from(schema.pipelineStages)
        .where(and(
          eq(schema.pipelineStages.id, stageId),
          eq(schema.pipelineStages.tenantId, tenantId),
        ));

      if (!newStage) return { error: 'STAGE_NOT_FOUND' };

      // Get current deal to track old stage
      const [currentDeal] = await tx.select()
        .from(schema.deals)
        .where(and(
          eq(schema.deals.id, id),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (!currentDeal) return { error: 'NOT_FOUND' };

      const stageUpdates: Record<string, unknown> = {
        pipelineStageId: stageId,
        updatedAt: new Date(),
      };

      if (newStage.isClosedWon) {
        stageUpdates.wonAt = new Date();

        // Update contact type to past_client
        await tx.update(schema.contacts)
          .set({ contactType: 'past_client', updatedAt: new Date() })
          .where(eq(schema.contacts.id, currentDeal.contactId));
      }

      if (newStage.isClosedLost) {
        stageUpdates.lostAt = new Date();
      }

      const [deal] = await tx.update(schema.deals)
        .set(stageUpdates)
        .where(eq(schema.deals.id, id))
        .returning();

      return {
        deal,
        previousStageId: currentDeal.pipelineStageId,
        newStageName: newStage.stageName,
      };
    });

    if ('error' in result) {
      if (result.error === 'STAGE_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pipeline stage not found' } });
      }
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deal not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'deal.stage_change',
      resourceType: 'deal',
      resourceId: id,
      details: {
        previousStageId: result.previousStageId,
        newStageId: stageId,
        newStageName: result.newStageName,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(result.deal);
  } catch (err) {
    console.error('Move deal stage error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to move deal to new stage' } });
  }
});

export default router;
