import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql, lte } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ------------------------------------------------------------------ //
//  Constants                                                          //
// ------------------------------------------------------------------ //

const VALID_SEQUENCE_TYPES = [
  'lead_nurture',
  'active_transaction',
  'post_close',
  're_engagement',
  'custom',
] as const;

const VALID_CHANNELS = ['email', 'sms', 'push', 'in_app'] as const;

const VALID_ENROLLMENT_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;

const VALID_MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'failed', 'bounced'] as const;

const MESSAGE_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['sent', 'failed'],
  sent: ['delivered', 'bounced'],
  delivered: ['opened'],
  opened: ['clicked'],
  clicked: ['replied'],
};

// ================================================================== //
//  SEQUENCES                                                          //
// ================================================================== //

// GET /api/v1/follow-up/sequences — List follow-up sequences
router.get('/sequences', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const sequenceType = req.query.sequenceType as string;
    const isActive = req.query.isActive as string;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.followUpSequences.tenantId, tenantId),
      isNull(schema.followUpSequences.deletedAt),
    ];

    if (sequenceType) {
      if (!(VALID_SEQUENCE_TYPES as readonly string[]).includes(sequenceType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `sequenceType must be one of: ${VALID_SEQUENCE_TYPES.join(', ')}` } });
      }
      conditions.push(eq(schema.followUpSequences.sequenceType, sequenceType));
    }

    if (isActive !== undefined) {
      conditions.push(eq(schema.followUpSequences.isActive, isActive === 'true'));
    }

    const sequences = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.followUpSequences.id,
        sequenceName: schema.followUpSequences.sequenceName,
        sequenceType: schema.followUpSequences.sequenceType,
        description: schema.followUpSequences.description,
        triggerEvent: schema.followUpSequences.triggerEvent,
        targetContactTypes: schema.followUpSequences.targetContactTypes,
        isActive: schema.followUpSequences.isActive,
        createdAt: schema.followUpSequences.createdAt,
        updatedAt: schema.followUpSequences.updatedAt,
        enrollmentCount: sql<number>`(
          SELECT count(*)::int FROM follow_up_enrollments
          WHERE sequence_id = ${schema.followUpSequences.id}
            AND tenant_id = ${tenantId}
            AND status = 'active'
        )`,
      })
        .from(schema.followUpSequences)
        .where(and(...conditions))
        .orderBy(desc(schema.followUpSequences.createdAt));
    });

    return res.json({ data: sequences });
  } catch (err) {
    console.error('List sequences error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list follow-up sequences' } });
  }
});

// POST /api/v1/follow-up/sequences — Create follow-up sequence
router.post('/sequences', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      sequenceName, sequenceType, description,
      triggerEvent, steps, targetContactTypes,
    } = req.body;

    if (!sequenceName || !sequenceType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'sequenceName and sequenceType are required' } });
    }

    if (!(VALID_SEQUENCE_TYPES as readonly string[]).includes(sequenceType)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `sequenceType must be one of: ${VALID_SEQUENCE_TYPES.join(', ')}` } });
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'steps must be a non-empty array' } });
    }

    // Validate each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.stepOrder === undefined || step.delayDays === undefined || !step.channel || !step.templateBody) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Step ${i} requires stepOrder, delayDays, channel, and templateBody` } });
      }
      if (!(VALID_CHANNELS as readonly string[]).includes(step.channel)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Step ${i} channel must be one of: ${VALID_CHANNELS.join(', ')}` } });
      }
    }

    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.followUpSequences).values({
        tenantId,
        sequenceName,
        sequenceType,
        description: description || null,
        triggerEvent: triggerEvent || null,
        steps,
        targetContactTypes: targetContactTypes || [],
        isActive: true,
        createdBy: userId,
      }).returning();
    });

    logAudit({
      tenantId, userId,
      action: 'follow_up_sequence.create',
      resourceType: 'follow_up_sequence',
      resourceId: sequence.id,
      details: { sequenceName, sequenceType, stepCount: steps.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(sequence);
  } catch (err) {
    console.error('Create sequence error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create follow-up sequence' } });
  }
});

// GET /api/v1/follow-up/sequences/:id — Get sequence detail
router.get('/sequences/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpSequences)
        .where(and(
          eq(schema.followUpSequences.id, id),
          eq(schema.followUpSequences.tenantId, tenantId),
          isNull(schema.followUpSequences.deletedAt),
        ));
    });

    if (!sequence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sequence not found' } });
    }

    // Fetch enrollment stats
    const [enrollmentStats] = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
        paused: sql<number>`count(*) filter (where status = 'paused')::int`,
      })
        .from(schema.followUpEnrollments)
        .where(and(
          eq(schema.followUpEnrollments.sequenceId, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
        ));
    });

    return res.json({
      data: {
        ...sequence,
        enrollmentStats: enrollmentStats || { active: 0, completed: 0, cancelled: 0, paused: 0 },
      },
    });
  } catch (err) {
    console.error('Get sequence error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get follow-up sequence' } });
  }
});

// PATCH /api/v1/follow-up/sequences/:id — Update sequence
router.patch('/sequences/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['sequenceName', 'sequenceType', 'description', 'triggerEvent', 'steps', 'targetContactTypes', 'isActive'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.sequenceType && !(VALID_SEQUENCE_TYPES as readonly string[]).includes(updates.sequenceType as string)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `sequenceType must be one of: ${VALID_SEQUENCE_TYPES.join(', ')}` } });
    }

    if (updates.steps) {
      const steps = updates.steps as any[];
      if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'steps must be a non-empty array' } });
      }
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].channel && !(VALID_CHANNELS as readonly string[]).includes(steps[i].channel)) {
          return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Step ${i} channel must be one of: ${VALID_CHANNELS.join(', ')}` } });
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpSequences)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.followUpSequences.id, id),
          eq(schema.followUpSequences.tenantId, tenantId),
          isNull(schema.followUpSequences.deletedAt),
        ))
        .returning();
    });

    if (!sequence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sequence not found' } });
    }

    logAudit({
      tenantId, userId,
      action: 'follow_up_sequence.update',
      resourceType: 'follow_up_sequence',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(sequence);
  } catch (err) {
    console.error('Update sequence error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update follow-up sequence' } });
  }
});

// DELETE /api/v1/follow-up/sequences/:id — Deactivate sequence (soft)
router.delete('/sequences/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpSequences)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(schema.followUpSequences.id, id),
          eq(schema.followUpSequences.tenantId, tenantId),
          isNull(schema.followUpSequences.deletedAt),
        ))
        .returning();
    });

    if (!sequence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sequence not found' } });
    }

    logAudit({
      tenantId, userId,
      action: 'follow_up_sequence.deactivate',
      resourceType: 'follow_up_sequence',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Deactivate sequence error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate follow-up sequence' } });
  }
});

// ================================================================== //
//  ENROLLMENTS                                                        //
// ================================================================== //

// GET /api/v1/follow-up/enrollments — List enrollments
router.get('/enrollments', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const contactId = req.query.contactId as string;
    const sequenceId = req.query.sequenceId as string;
    const status = req.query.status as string;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.followUpEnrollments.tenantId, tenantId),
    ];

    if (contactId) {
      conditions.push(eq(schema.followUpEnrollments.contactId, contactId));
    }
    if (sequenceId) {
      conditions.push(eq(schema.followUpEnrollments.sequenceId, sequenceId));
    }
    if (status) {
      if (!(VALID_ENROLLMENT_STATUSES as readonly string[]).includes(status)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_ENROLLMENT_STATUSES.join(', ')}` } });
      }
      conditions.push(eq(schema.followUpEnrollments.status, status));
    }

    const [enrollments, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select({
        id: schema.followUpEnrollments.id,
        contactId: schema.followUpEnrollments.contactId,
        sequenceId: schema.followUpEnrollments.sequenceId,
        status: schema.followUpEnrollments.status,
        currentStep: schema.followUpEnrollments.currentStep,
        nextStepAt: schema.followUpEnrollments.nextStepAt,
        enrolledAt: schema.followUpEnrollments.enrolledAt,
        completedAt: schema.followUpEnrollments.completedAt,
        cancelledAt: schema.followUpEnrollments.cancelledAt,
        pausedAt: schema.followUpEnrollments.pausedAt,
        contactName: sql<string>`(
          SELECT CONCAT(first_name, ' ', last_name)
          FROM contacts
          WHERE id = ${schema.followUpEnrollments.contactId}
            AND tenant_id = ${tenantId}
        )`,
        sequenceName: sql<string>`(
          SELECT sequence_name
          FROM follow_up_sequences
          WHERE id = ${schema.followUpEnrollments.sequenceId}
            AND tenant_id = ${tenantId}
        )`,
      })
        .from(schema.followUpEnrollments)
        .where(and(...conditions))
        .orderBy(desc(schema.followUpEnrollments.enrolledAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.followUpEnrollments)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({ data: enrollments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('List enrollments error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list enrollments' } });
  }
});

// POST /api/v1/follow-up/enrollments — Enroll a contact
router.post('/enrollments', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { contactId, sequenceId } = req.body;

    if (!contactId || !sequenceId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'contactId and sequenceId are required' } });
    }

    // Verify the sequence exists and is active
    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpSequences)
        .where(and(
          eq(schema.followUpSequences.id, sequenceId),
          eq(schema.followUpSequences.tenantId, tenantId),
          eq(schema.followUpSequences.isActive, true),
          isNull(schema.followUpSequences.deletedAt),
        ));
    });

    if (!sequence) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Active sequence not found' } });
    }

    // Check contact is not already actively enrolled in this sequence
    const [existingEnrollment] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpEnrollments)
        .where(and(
          eq(schema.followUpEnrollments.contactId, contactId),
          eq(schema.followUpEnrollments.sequenceId, sequenceId),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
        ));
    });

    if (existingEnrollment) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Contact is already actively enrolled in this sequence' } });
    }

    // Calculate nextStepAt from the first step delay
    const steps = (sequence.steps as any[]) || [];
    const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const firstStepDelayDays = sortedSteps.length > 0 ? (sortedSteps[0].delayDays || 0) : 0;
    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + firstStepDelayDays);

    const [enrollment] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.followUpEnrollments).values({
        tenantId,
        contactId,
        sequenceId,
        status: 'active',
        currentStep: 0,
        nextStepAt,
        enrolledAt: new Date(),
        enrolledBy: userId,
      }).returning();
    });

    logAudit({
      tenantId, userId,
      action: 'follow_up_enrollment.create',
      resourceType: 'follow_up_enrollment',
      resourceId: enrollment.id,
      details: { contactId, sequenceId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(enrollment);
  } catch (err) {
    console.error('Enroll contact error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll contact' } });
  }
});

// PATCH /api/v1/follow-up/enrollments/:id/pause — Pause enrollment
router.patch('/enrollments/:id/pause', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [enrollment] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpEnrollments)
        .set({
          status: 'paused',
          pausedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.followUpEnrollments.id, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
        ))
        .returning();
    });

    if (!enrollment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Active enrollment not found' } });
    }

    logAudit({
      tenantId, userId,
      action: 'follow_up_enrollment.pause',
      resourceType: 'follow_up_enrollment',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(enrollment);
  } catch (err) {
    console.error('Pause enrollment error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to pause enrollment' } });
  }
});

// PATCH /api/v1/follow-up/enrollments/:id/resume — Resume paused enrollment
router.patch('/enrollments/:id/resume', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    // Fetch the enrollment and its sequence to recalculate nextStepAt
    const [existing] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpEnrollments)
        .where(and(
          eq(schema.followUpEnrollments.id, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'paused'),
        ));
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Paused enrollment not found' } });
    }

    // Fetch the sequence to get step delays
    const [sequence] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpSequences)
        .where(eq(schema.followUpSequences.id, existing.sequenceId));
    });

    const steps = (sequence?.steps as any[]) || [];
    const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const currentStepIndex = existing.currentStep || 0;
    const currentStepDelay = currentStepIndex < sortedSteps.length
      ? (sortedSteps[currentStepIndex].delayDays || 0)
      : 1;

    const nextStepAt = new Date();
    nextStepAt.setDate(nextStepAt.getDate() + currentStepDelay);

    const [enrollment] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpEnrollments)
        .set({
          status: 'active',
          pausedAt: null,
          nextStepAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.followUpEnrollments.id, id))
        .returning();
    });

    logAudit({
      tenantId, userId,
      action: 'follow_up_enrollment.resume',
      resourceType: 'follow_up_enrollment',
      resourceId: id,
      details: { nextStepAt },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(enrollment);
  } catch (err) {
    console.error('Resume enrollment error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to resume enrollment' } });
  }
});

// PATCH /api/v1/follow-up/enrollments/:id/cancel — Cancel enrollment
router.patch('/enrollments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    const [enrollment] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpEnrollments)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.followUpEnrollments.id, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
        ))
        .returning();
    });

    if (!enrollment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Active enrollment not found' } });
    }

    logAudit({
      tenantId, userId,
      action: 'follow_up_enrollment.cancel',
      resourceType: 'follow_up_enrollment',
      resourceId: id,
      details: { reason: reason || null },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(enrollment);
  } catch (err) {
    console.error('Cancel enrollment error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel enrollment' } });
  }
});

// POST /api/v1/follow-up/enrollments/process-due — Process due follow-up steps (cron job endpoint)
router.post('/enrollments/process-due', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const now = new Date();

    // Find all active enrollments where nextStepAt <= now
    const dueEnrollments = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        enrollment: schema.followUpEnrollments,
        sequence: schema.followUpSequences,
      })
        .from(schema.followUpEnrollments)
        .innerJoin(
          schema.followUpSequences,
          eq(schema.followUpEnrollments.sequenceId, schema.followUpSequences.id),
        )
        .where(and(
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
          lte(schema.followUpEnrollments.nextStepAt, now),
        ));
    });

    let processed = 0;
    let messagesCreated = 0;

    for (const { enrollment, sequence } of dueEnrollments) {
      const steps = (sequence.steps as any[]) || [];
      const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
      const currentStepIndex = enrollment.currentStep || 0;

      if (currentStepIndex >= sortedSteps.length) {
        // All steps complete — mark enrollment as completed
        await withTenantContext(tenantId, async (tx) => {
          return tx.update(schema.followUpEnrollments)
            .set({
              status: 'completed',
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(schema.followUpEnrollments.id, enrollment.id));
        });
        processed++;
        continue;
      }

      const currentStep = sortedSteps[currentStepIndex];

      // Create a follow_up_message record with status='pending'
      await withTenantContext(tenantId, async (tx) => {
        return tx.insert(schema.followUpMessages).values({
          tenantId,
          enrollmentId: enrollment.id,
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          stepIndex: currentStepIndex,
          channel: currentStep.channel,
          subject: currentStep.subject || null,
          templateBody: currentStep.templateBody,
          status: 'pending',
          scheduledAt: now,
        }).returning();
      });
      messagesCreated++;

      // Advance currentStep and calculate next nextStepAt
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex >= sortedSteps.length) {
        // This was the last step — mark completed
        await withTenantContext(tenantId, async (tx) => {
          return tx.update(schema.followUpEnrollments)
            .set({
              currentStep: nextStepIndex,
              status: 'completed',
              completedAt: now,
              nextStepAt: null,
              updatedAt: now,
            })
            .where(eq(schema.followUpEnrollments.id, enrollment.id));
        });
      } else {
        const nextStepDelay = sortedSteps[nextStepIndex].delayDays || 0;
        const nextStepAt = new Date(now);
        nextStepAt.setDate(nextStepAt.getDate() + nextStepDelay);

        await withTenantContext(tenantId, async (tx) => {
          return tx.update(schema.followUpEnrollments)
            .set({
              currentStep: nextStepIndex,
              nextStepAt,
              updatedAt: now,
            })
            .where(eq(schema.followUpEnrollments.id, enrollment.id));
        });
      }

      processed++;
    }

    logAudit({
      tenantId, userId,
      action: 'follow_up_enrollment.process_due',
      resourceType: 'follow_up_enrollment',
      details: { processed, messagesCreated },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { processed, messages_created: messagesCreated } });
  } catch (err) {
    console.error('Process due enrollments error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process due follow-up steps' } });
  }
});

// ================================================================== //
//  MESSAGES                                                           //
// ================================================================== //

// GET /api/v1/follow-up/messages — List follow-up messages
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const contactId = req.query.contactId as string;
    const enrollmentId = req.query.enrollmentId as string;
    const status = req.query.status as string;
    const channel = req.query.channel as string;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.followUpMessages.tenantId, tenantId),
    ];

    if (contactId) {
      conditions.push(eq(schema.followUpMessages.contactId, contactId));
    }
    if (enrollmentId) {
      conditions.push(eq(schema.followUpMessages.enrollmentId, enrollmentId));
    }
    if (status) {
      if (!(VALID_MESSAGE_STATUSES as readonly string[]).includes(status)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_MESSAGE_STATUSES.join(', ')}` } });
      }
      conditions.push(eq(schema.followUpMessages.status, status));
    }
    if (channel) {
      if (!(VALID_CHANNELS as readonly string[]).includes(channel)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `channel must be one of: ${VALID_CHANNELS.join(', ')}` } });
      }
      conditions.push(eq(schema.followUpMessages.channel, channel));
    }

    const [messages, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.followUpMessages)
        .where(and(...conditions))
        .orderBy(desc(schema.followUpMessages.scheduledAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.followUpMessages)
        .where(and(...conditions));

      return [rows, countResult];
    });

    return res.json({ data: messages, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('List messages error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list follow-up messages' } });
  }
});

// PATCH /api/v1/follow-up/messages/:id/status — Update message delivery status
router.patch('/messages/:id/status', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { status, metadata } = req.body;

    if (!status) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'status is required' } });
    }

    if (!(VALID_MESSAGE_STATUSES as readonly string[]).includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_MESSAGE_STATUSES.join(', ')}` } });
    }

    // Fetch current message to validate transition
    const [existingMessage] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.followUpMessages)
        .where(and(
          eq(schema.followUpMessages.id, id),
          eq(schema.followUpMessages.tenantId, tenantId),
        ));
    });

    if (!existingMessage) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    // Validate status transition
    const allowedTransitions = MESSAGE_STATUS_TRANSITIONS[existingMessage.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from '${existingMessage.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        },
      });
    }

    const updateFields: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (metadata) {
      updateFields.metadata = metadata;
    }

    // Set timestamp fields based on the status
    if (status === 'sent') updateFields.sentAt = new Date();
    if (status === 'delivered') updateFields.deliveredAt = new Date();
    if (status === 'opened') updateFields.openedAt = new Date();
    if (status === 'clicked') updateFields.clickedAt = new Date();
    if (status === 'replied') updateFields.repliedAt = new Date();
    if (status === 'failed') updateFields.failedAt = new Date();
    if (status === 'bounced') updateFields.bouncedAt = new Date();

    const [message] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.followUpMessages)
        .set(updateFields)
        .where(eq(schema.followUpMessages.id, id))
        .returning();
    });

    logAudit({
      tenantId, userId,
      action: 'follow_up_message.status_update',
      resourceType: 'follow_up_message',
      resourceId: id,
      details: { from: existingMessage.status, to: status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(message);
  } catch (err) {
    console.error('Update message status error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update message status' } });
  }
});

// ================================================================== //
//  ANALYTICS                                                          //
// ================================================================== //

// GET /api/v1/follow-up/analytics — Follow-up analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    // Per-sequence message stats
    const sequenceStats = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        sequenceId: schema.followUpMessages.sequenceId,
        sequenceName: sql<string>`(
          SELECT sequence_name
          FROM follow_up_sequences
          WHERE id = ${schema.followUpMessages.sequenceId}
            AND tenant_id = ${tenantId}
        )`,
        totalSent: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('sent', 'delivered', 'opened', 'clicked', 'replied'))::int`,
        delivered: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('delivered', 'opened', 'clicked', 'replied'))::int`,
        opened: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('opened', 'clicked', 'replied'))::int`,
        clicked: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('clicked', 'replied'))::int`,
        replied: sql<number>`count(*) filter (where ${schema.followUpMessages.status} = 'replied')::int`,
        bounced: sql<number>`count(*) filter (where ${schema.followUpMessages.status} = 'bounced')::int`,
        failed: sql<number>`count(*) filter (where ${schema.followUpMessages.status} = 'failed')::int`,
      })
        .from(schema.followUpMessages)
        .where(eq(schema.followUpMessages.tenantId, tenantId))
        .groupBy(schema.followUpMessages.sequenceId);
    });

    // Overall totals
    const [overallStats] = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        totalMessages: sql<number>`count(*)::int`,
        totalSent: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('sent', 'delivered', 'opened', 'clicked', 'replied'))::int`,
        delivered: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('delivered', 'opened', 'clicked', 'replied'))::int`,
        opened: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('opened', 'clicked', 'replied'))::int`,
        clicked: sql<number>`count(*) filter (where ${schema.followUpMessages.status} IN ('clicked', 'replied'))::int`,
        replied: sql<number>`count(*) filter (where ${schema.followUpMessages.status} = 'replied')::int`,
        bounced: sql<number>`count(*) filter (where ${schema.followUpMessages.status} = 'bounced')::int`,
      })
        .from(schema.followUpMessages)
        .where(eq(schema.followUpMessages.tenantId, tenantId));
    });

    const totalSent = overallStats?.totalSent || 0;
    const overallRates = {
      openRate: totalSent > 0 ? Math.round(((overallStats?.opened || 0) / totalSent) * 10000) / 100 : 0,
      clickRate: totalSent > 0 ? Math.round(((overallStats?.clicked || 0) / totalSent) * 10000) / 100 : 0,
      replyRate: totalSent > 0 ? Math.round(((overallStats?.replied || 0) / totalSent) * 10000) / 100 : 0,
      bounceRate: totalSent > 0 ? Math.round(((overallStats?.bounced || 0) / totalSent) * 10000) / 100 : 0,
    };

    // Best performing sequences (by reply rate)
    const bestPerforming = [...sequenceStats]
      .map((s) => {
        const sent = s.totalSent || 0;
        return {
          sequenceId: s.sequenceId,
          sequenceName: s.sequenceName,
          replyRate: sent > 0 ? Math.round(((s.replied || 0) / sent) * 10000) / 100 : 0,
          openRate: sent > 0 ? Math.round(((s.opened || 0) / sent) * 10000) / 100 : 0,
          totalSent: sent,
        };
      })
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 5);

    return res.json({
      data: {
        overall: {
          ...overallStats,
          rates: overallRates,
        },
        bySequence: sequenceStats,
        bestPerforming,
      },
    });
  } catch (err) {
    console.error('Follow-up analytics error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get follow-up analytics' } });
  }
});

export default router;
