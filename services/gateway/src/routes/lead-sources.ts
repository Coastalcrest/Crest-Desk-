import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql, asc } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const VALID_SOURCE_TYPES = [
  'website',
  'zillow',
  'realtor_com',
  'redfin',
  'referral',
  'open_house',
  'social_media',
  'paid_ads',
  'cold_call',
  'walk_in',
  'other',
] as const;

const VALID_DISTRIBUTION_RULES = [
  'round_robin',
  'manual',
  'weighted',
  'geographic',
  'performance_based',
] as const;

// ================================================================== //
//  LEAD SOURCES                                                       //
// ================================================================== //

// GET /api/v1/lead-sources — List lead sources
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const sources = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.leadSources.id,
        sourceName: schema.leadSources.sourceName,
        sourceType: schema.leadSources.sourceType,
        isActive: schema.leadSources.isActive,
        leadDistributionRule: schema.leadSources.leadDistributionRule,
        leadDistributionConfig: schema.leadSources.leadDistributionConfig,
        autoResponseSequenceId: schema.leadSources.autoResponseSequenceId,
        totalLeads: schema.leadSources.totalLeads,
        convertedLeads: schema.leadSources.convertedLeads,
        createdAt: schema.leadSources.createdAt,
        updatedAt: schema.leadSources.updatedAt,
        conversionRate: sql<number>`
          CASE WHEN ${schema.leadSources.totalLeads} > 0
            THEN ROUND((${schema.leadSources.convertedLeads}::numeric / ${schema.leadSources.totalLeads}::numeric) * 100, 2)
            ELSE 0
          END
        `,
      })
        .from(schema.leadSources)
        .where(and(
          eq(schema.leadSources.tenantId, tenantId),
          isNull(schema.leadSources.deletedAt),
        ))
        .orderBy(desc(schema.leadSources.createdAt));
    });

    return res.json({ data: sources });
  } catch (err) {
    logger.error({ err, tenantId }, 'List lead sources error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list lead sources' } });
  }
});

// POST /api/v1/lead-sources — Create lead source (Managing Broker+)
router.post('/', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      sourceName, sourceType, autoResponseSequenceId,
      leadDistributionRule, leadDistributionConfig,
    } = req.body;

    if (!sourceName || !sourceType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'sourceName and sourceType are required' } });
    }

    if (!(VALID_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}` } });
    }

    if (leadDistributionRule && !(VALID_DISTRIBUTION_RULES as readonly string[]).includes(leadDistributionRule)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `leadDistributionRule must be one of: ${VALID_DISTRIBUTION_RULES.join(', ')}` } });
    }

    // Validate autoResponseSequenceId exists if provided
    if (autoResponseSequenceId) {
      const [sequence] = await withTenantContext(tenantId, async (tx) => {
        return tx.select({ id: schema.followUpSequences.id })
          .from(schema.followUpSequences)
          .where(and(
            eq(schema.followUpSequences.id, autoResponseSequenceId),
            eq(schema.followUpSequences.tenantId, tenantId),
            eq(schema.followUpSequences.isActive, true),
            isNull(schema.followUpSequences.deletedAt),
          ));
      });

      if (!sequence) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'autoResponseSequenceId must reference an active follow-up sequence' } });
      }
    }

    const [source] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.leadSources).values({
        tenantId,
        sourceName,
        sourceType,
        autoResponseSequenceId: autoResponseSequenceId || null,
        leadDistributionRule: leadDistributionRule || 'manual',
        leadDistributionConfig: leadDistributionConfig || {},
        isActive: true,
        totalLeads: 0,
        convertedLeads: 0,
        createdBy: userId,
      }).returning();
    });

    logAudit({
      tenantId, userId,
      action: 'lead_source.create',
      resourceType: 'lead_source',
      resourceId: source.id,
      details: { sourceName, sourceType, leadDistributionRule },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(source);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create lead source error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create lead source' } });
  }
});

// PATCH /api/v1/lead-sources/:id — Update lead source
router.patch('/:id', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = [
      'sourceName', 'sourceType', 'autoResponseSequenceId',
      'leadDistributionRule', 'leadDistributionConfig', 'isActive',
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.sourceType && !(VALID_SOURCE_TYPES as readonly string[]).includes(updates.sourceType as string)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}` } });
    }

    if (updates.leadDistributionRule && !(VALID_DISTRIBUTION_RULES as readonly string[]).includes(updates.leadDistributionRule as string)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `leadDistributionRule must be one of: ${VALID_DISTRIBUTION_RULES.join(', ')}` } });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [source] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.leadSources)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.leadSources.id, id),
          eq(schema.leadSources.tenantId, tenantId),
          isNull(schema.leadSources.deletedAt),
        ))
        .returning();
    });

    if (!source) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead source not found' } });
    }

    logAudit({
      tenantId, userId,
      action: 'lead_source.update',
      resourceType: 'lead_source',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(source);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update lead source error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update lead source' } });
  }
});

// ================================================================== //
//  LEAD INGESTION                                                     //
// ================================================================== //

// POST /api/v1/lead-sources/ingest — Ingest a lead from external source
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { sourceName, contact, metadata } = req.body;

    if (!sourceName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'sourceName is required' } });
    }

    if (!contact || !contact.firstName || !contact.lastName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'contact with firstName and lastName is required' } });
    }

    if (!contact.email && !contact.phone) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'contact must have at least an email or phone' } });
    }

    // Find or create the lead source
    let [leadSource] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.leadSources)
        .where(and(
          eq(schema.leadSources.sourceName, sourceName),
          eq(schema.leadSources.tenantId, tenantId),
          isNull(schema.leadSources.deletedAt),
        ));
    });

    if (!leadSource) {
      const [created] = await withTenantContext(tenantId, async (tx) => {
        return tx.insert(schema.leadSources).values({
          tenantId,
          sourceName,
          sourceType: 'other',
          leadDistributionRule: 'manual',
          leadDistributionConfig: {},
          isActive: true,
          totalLeads: 0,
          convertedLeads: 0,
          createdBy: userId,
        }).returning();
      });
      leadSource = created;
    }

    // Create contact with source attribution
    const [newContact] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.contacts).values({
        tenantId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || null,
        phone: contact.phone || null,
        contactType: contact.contactType || 'lead',
        leadSourceId: leadSource.id,
        leadSourceName: sourceName,
        address: contact.address || null,
        city: contact.city || null,
        state: contact.state || null,
        zip: contact.zip || null,
        notes: contact.notes || null,
        metadata: metadata || {},
        createdBy: userId,
      }).returning();
    });

    // Increment totalLeads counter on lead source
    await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.leadSources)
        .set({
          totalLeads: sql`${schema.leadSources.totalLeads} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.leadSources.id, leadSource.id));
    });

    let enrolledSequenceId: string | null = null;
    let assignedAgentId: string | null = null;

    // Auto-enroll in follow-up sequence if configured
    if (leadSource.autoResponseSequenceId) {
      const [sequence] = await withTenantContext(tenantId, async (tx) => {
        return tx.select().from(schema.followUpSequences)
          .where(and(
            eq(schema.followUpSequences.id, leadSource.autoResponseSequenceId!),
            eq(schema.followUpSequences.tenantId, tenantId),
            eq(schema.followUpSequences.isActive, true),
          ));
      });

      if (sequence) {
        const steps = (sequence.steps as any[]) || [];
        const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
        const firstStepDelay = sortedSteps.length > 0 ? (sortedSteps[0].delayDays || 0) : 0;
        const nextStepAt = new Date();
        nextStepAt.setDate(nextStepAt.getDate() + firstStepDelay);

        const [enrollment] = await withTenantContext(tenantId, async (tx) => {
          return tx.insert(schema.followUpEnrollments).values({
            tenantId,
            contactId: newContact.id,
            sequenceId: sequence.id,
            status: 'active',
            currentStep: 0,
            nextStepAt,
            enrolledAt: new Date(),
            enrolledBy: userId,
          }).returning();
        });

        enrolledSequenceId = enrollment.id;
      }
    }

    // Distribute to agent based on distribution rule
    if (leadSource.leadDistributionRule === 'round_robin') {
      // Find agent with fewest leads this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const agents = await withTenantContext(tenantId, async (tx) => {
        return tx.select({
          agentId: schema.users.id,
          leadCount: sql<number>`(
            SELECT count(*)::int FROM contacts
            WHERE assigned_agent_id = ${schema.users.id}
              AND tenant_id = ${tenantId}
              AND created_at >= ${startOfMonth.toISOString()}
          )`,
        })
          .from(schema.users)
          .where(and(
            eq(schema.users.tenantId, tenantId),
            eq(schema.users.role, 'agent'),
            eq(schema.users.isActive, true),
            isNull(schema.users.deletedAt),
          ))
          .orderBy(asc(sql`(
            SELECT count(*)::int FROM contacts
            WHERE assigned_agent_id = ${schema.users.id}
              AND tenant_id = ${tenantId}
              AND created_at >= ${startOfMonth.toISOString()}
          )`))
          .limit(1);
      });

      if (agents.length > 0) {
        assignedAgentId = agents[0].agentId;

        // Update the contact with the assigned agent
        await withTenantContext(tenantId, async (tx) => {
          return tx.update(schema.contacts)
            .set({
              assignedAgentId,
              updatedAt: new Date(),
            })
            .where(eq(schema.contacts.id, newContact.id));
        });
      }
    }

    logAudit({
      tenantId, userId,
      action: 'lead_source.ingest',
      resourceType: 'lead_source',
      resourceId: leadSource.id,
      details: {
        contactId: newContact.id,
        sourceName,
        assignedAgentId,
        enrolledSequenceId,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      data: {
        contactId: newContact.id,
        assignedAgentId,
        enrolledSequenceId,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Ingest lead error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to ingest lead' } });
  }
});

// ================================================================== //
//  PERFORMANCE                                                        //
// ================================================================== //

// GET /api/v1/lead-sources/:id/performance — Lead source performance
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    // Verify source exists
    const [source] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.leadSources)
        .where(and(
          eq(schema.leadSources.id, id),
          eq(schema.leadSources.tenantId, tenantId),
          isNull(schema.leadSources.deletedAt),
        ));
    });

    if (!source) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead source not found' } });
    }

    // Conversion rate
    const totalLeads = source.totalLeads || 0;
    const convertedLeads = source.convertedLeads || 0;
    const conversionRate = totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 10000) / 100
      : 0;

    // Average time to convert (in days)
    const [avgConversion] = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        avgDays: sql<number>`
          COALESCE(
            ROUND(AVG(EXTRACT(EPOCH FROM (converted_at - created_at)) / 86400)::numeric, 1),
            0
          )
        `,
      })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.leadSourceId, id),
          eq(schema.contacts.tenantId, tenantId),
          sql`converted_at IS NOT NULL`,
        ));
    });

    // Lead quality score (based on conversion rate and engagement)
    const leadQualityScore = Math.min(
      Math.round(conversionRate * 10) / 10,
      10,
    );

    // Leads by status breakdown
    const statusBreakdown = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        status: schema.contacts.contactType,
        count: sql<number>`count(*)::int`,
      })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.leadSourceId, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ))
        .groupBy(schema.contacts.contactType);
    });

    return res.json({
      data: {
        sourceId: id,
        sourceName: source.sourceName,
        sourceType: source.sourceType,
        totalLeads,
        convertedLeads,
        conversionRate,
        avgDaysToConvert: avgConversion?.avgDays || 0,
        leadQualityScore,
        leadsByStatus: statusBreakdown,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Lead source performance error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get lead source performance' } });
  }
});

export default router;
