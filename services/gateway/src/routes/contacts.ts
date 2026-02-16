import { Router, Request, Response } from 'express';
import { eq, and, or, isNull, desc, asc, ilike, sql, lte } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createContactSchema,
  updateContactSchema,
  listContactsQuery,
  addTagsSchema,
  importContactsSchema,
  logActivitySchema,
  enrollContactSchema,
} from '../schemas';
import { sendData, sendPaginated, sendError } from '../lib/response';
import { logger } from '../lib/logger';

const ROLE_LEVEL: Record<string, number> = { agent: 0, managing_broker: 1, principal_broker: 2, owner: 3 };
function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/contacts — List contacts ---------- //
router.get('/', validateQuery(listContactsQuery), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { page, pageSize, search, contactType, source, tag, ownerId, sortBy } = req.query as any;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(schema.contacts.tenantId, tenantId),
      isNull(schema.contacts.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(schema.contacts.firstName, `%${search}%`),
          ilike(schema.contacts.lastName, `%${search}%`),
          ilike(schema.contacts.email, `%${search}%`),
        )!,
      );
    }
    if (contactType) {
      conditions.push(eq(schema.contacts.contactType, contactType));
    }
    if (source) {
      conditions.push(eq(schema.contacts.source, source));
    }
    if (tag) {
      conditions.push(sql`${schema.contacts.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`);
    }
    if (ownerId) {
      conditions.push(eq(schema.contacts.ownerUserId, ownerId));
    }

    // Determine sort order
    let orderClause;
    switch (sortBy) {
      case 'name':
        orderClause = asc(schema.contacts.lastName);
        break;
      case 'lastContacted':
        orderClause = desc(schema.contacts.lastContactedAt);
        break;
      case 'leadScore':
        orderClause = desc(schema.contacts.leadScore);
        break;
      case 'createdAt':
      default:
        orderClause = desc(schema.contacts.createdAt);
        break;
    }

    const [contacts, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: schema.contacts.id,
          tenantId: schema.contacts.tenantId,
          ownerUserId: schema.contacts.ownerUserId,
          firstName: schema.contacts.firstName,
          lastName: schema.contacts.lastName,
          email: schema.contacts.email,
          phone: schema.contacts.phone,
          company: schema.contacts.company,
          contactType: schema.contacts.contactType,
          source: schema.contacts.source,
          leadScore: schema.contacts.leadScore,
          tags: schema.contacts.tags,
          lastContactedAt: schema.contacts.lastContactedAt,
          nextFollowUpAt: schema.contacts.nextFollowUpAt,
          createdAt: schema.contacts.createdAt,
          activityCount: sql<number>`(
            SELECT count(*)::int FROM contact_activities
            WHERE contact_activities.contact_id = ${schema.contacts.id}
          )`,
        })
        .from(schema.contacts)
        .where(and(...conditions))
        .orderBy(orderClause)
        .limit(pageSize)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.contacts)
        .where(and(...conditions));

      return [rows, countResult];
    });

    sendPaginated(res, contacts, { page, pageSize, total });
  } catch (err) {
    logger.error({ err, tenantId }, 'List contacts error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list contacts' } });
  }
});

// ---------- GET /api/v1/contacts/stats — Contact stats ---------- //
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await withTenantContext(tenantId, async (tx) => {
      const [result] = await tx
        .select({
          totalContacts: sql<number>`count(*)::int`,
          leads: sql<number>`count(*) filter (where ${schema.contacts.contactType} = 'lead')::int`,
          activeClients: sql<number>`count(*) filter (where ${schema.contacts.contactType} = 'active_client')::int`,
          pastClients: sql<number>`count(*) filter (where ${schema.contacts.contactType} = 'past_client')::int`,
          needingFollowUp: sql<number>`count(*) filter (where ${schema.contacts.nextFollowUpAt} <= ${now})::int`,
          newThisMonth: sql<number>`count(*) filter (where ${schema.contacts.createdAt} >= ${startOfMonth})::int`,
        })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      return result;
    });

    return res.json({ data: stats });
  } catch (err) {
    logger.error({ err, tenantId }, 'Contact stats error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get contact stats' } });
  }
});

// ---------- POST /api/v1/contacts — Create contact ---------- //
router.post('/', validateBody(createContactSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      firstName, lastName, email, emailSecondary,
      phone, phoneSecondary, phoneType, preferredChannel,
      company, jobTitle,
      mailingAddress, mailingCity, mailingState, mailingZip,
      birthday, anniversary,
      source, sourceDetail, contactType,
      relationshipScore, leadScore,
      tags, customFields, socialProfiles, familyMembers,
      notes, nextFollowUpAt,
      doNotContact, smsConsent, smsConsentDate,
      ownerUserId,
    } = req.body;

    const [contact] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.contacts).values({
        tenantId,
        ownerUserId: ownerUserId || userId,
        firstName,
        lastName,
        email: email || null,
        emailSecondary: emailSecondary || null,
        phone: phone || null,
        phoneSecondary: phoneSecondary || null,
        phoneType: phoneType || null,
        preferredChannel: preferredChannel || 'email',
        company: company || null,
        jobTitle: jobTitle || null,
        mailingAddress: mailingAddress || null,
        mailingCity: mailingCity || null,
        mailingState: mailingState || null,
        mailingZip: mailingZip || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        source: source || null,
        sourceDetail: sourceDetail || null,
        contactType: contactType || 'lead',
        relationshipScore: relationshipScore ?? 50,
        leadScore: leadScore ?? 0,
        tags: tags || [],
        customFields: customFields || {},
        socialProfiles: socialProfiles || {},
        familyMembers: familyMembers || [],
        notes: notes || null,
        nextFollowUpAt: nextFollowUpAt || null,
        doNotContact: doNotContact ?? false,
        smsConsent: smsConsent ?? false,
        smsConsentDate: smsConsentDate || null,
      }).returning();
    });

    logAudit({
      tenantId,
      userId,
      action: 'contact.create',
      resourceType: 'contact',
      resourceId: contact.id,
      details: { firstName, lastName, email, source },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // TODO: If source has an auto-response sequence configured, auto-enroll the contact
    // This would look up leadSources by source name, check autoResponseSequenceId,
    // and create a followUpEnrollment if found.

    return res.status(201).json(contact);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create contact error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create contact' } });
  }
});

// ---------- GET /api/v1/contacts/:id — Get contact with recent activities ---------- //
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const result = await withTenantContext(tenantId, async (tx) => {
      const [contact] = await tx.select().from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!contact) return null;

      const recentActivities = await tx.select().from(schema.contactActivities)
        .where(and(
          eq(schema.contactActivities.contactId, id),
          eq(schema.contactActivities.tenantId, tenantId),
        ))
        .orderBy(desc(schema.contactActivities.createdAt))
        .limit(20);

      const activeEnrollments = await tx.select().from(schema.followUpEnrollments)
        .where(and(
          eq(schema.followUpEnrollments.contactId, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
        ));

      const linkedDeals = await tx.select().from(schema.deals)
        .where(and(
          eq(schema.deals.contactId, id),
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ))
        .orderBy(desc(schema.deals.createdAt));

      return { ...contact, recentActivities, activeEnrollments, linkedDeals };
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    return res.json(result);
  } catch (err) {
    logger.error({ err, tenantId }, 'Get contact error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get contact' } });
  }
});

// ---------- PATCH /api/v1/contacts/:id — Update contact ---------- //
router.patch('/:id', validateBody(updateContactSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    // Zod already validated and stripped unknown fields via .partial()
    const updates = req.body;

    const [contact] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.contacts)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ))
        .returning();
    });

    if (!contact) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'contact.update',
      resourceType: 'contact',
      resourceId: id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json(contact);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update contact error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update contact' } });
  }
});

// ---------- DELETE /api/v1/contacts/:id — Soft delete contact ---------- //
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [contact] = await withTenantContext(tenantId, async (tx) => {
      // Cancel all active follow-up enrollments for this contact
      await tx.update(schema.followUpEnrollments)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'contact_deleted',
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.followUpEnrollments.contactId, id),
          eq(schema.followUpEnrollments.tenantId, tenantId),
          eq(schema.followUpEnrollments.status, 'active'),
        ));

      return tx.update(schema.contacts)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ))
        .returning();
    });

    if (!contact) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'contact.delete',
      resourceType: 'contact',
      resourceId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(204).send();
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete contact error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete contact' } });
  }
});

// ---------- POST /api/v1/contacts/:id/activities — Log an activity ---------- //
router.post('/:id/activities', validateBody(logActivitySchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const {
      activityType, subject, description,
      channel, direction, metadata,
      relatedTransactionId, relatedDocumentId,
    } = req.body;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify contact exists
      const [contact] = await tx.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!contact) return null;

      const [activity] = await tx.insert(schema.contactActivities).values({
        tenantId,
        contactId: id,
        userId,
        activityType,
        subject: subject || null,
        description: description || null,
        channel: channel || null,
        direction: direction || null,
        metadata: metadata || {},
        relatedTransactionId: relatedTransactionId || null,
        relatedDocumentId: relatedDocumentId || null,
      }).returning();

      // Update lastContactedAt on the contact
      await tx.update(schema.contacts)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.contacts.id, id));

      return activity;
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    return res.status(201).json(result);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Log activity error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to log activity' } });
  }
});

// ---------- GET /api/v1/contacts/:id/activities — List contact activities ---------- //
router.get('/:id/activities', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * pageSize;
    const activityType = req.query.activityType as string;

    const conditions = [
      eq(schema.contactActivities.contactId, id),
      eq(schema.contactActivities.tenantId, tenantId),
    ];

    if (activityType) {
      conditions.push(eq(schema.contactActivities.activityType, activityType));
    }

    const [activities, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(schema.contactActivities)
        .where(and(...conditions))
        .orderBy(desc(schema.contactActivities.createdAt))
        .limit(pageSize)
        .offset(offset);

      const countResult = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.contactActivities)
        .where(and(...conditions));

      return [rows, countResult];
    });

    sendPaginated(res, activities, { page, pageSize, total });
  } catch (err) {
    logger.error({ err, tenantId }, 'List activities error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list activities' } });
  }
});

// ---------- POST /api/v1/contacts/:id/tags — Add tags ---------- //
router.post('/:id/tags', validateBody(addTagsSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { tags } = req.body;

    const [contact] = await withTenantContext(tenantId, async (tx) => {
      // Fetch current tags
      const [existing] = await tx.select({ tags: schema.contacts.tags })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!existing) return [null];

      const currentTags = (existing.tags as string[]) || [];
      const mergedTags = [...new Set([...currentTags, ...tags])];

      return tx.update(schema.contacts)
        .set({ tags: mergedTags, updatedAt: new Date() })
        .where(eq(schema.contacts.id, id))
        .returning();
    });

    if (!contact) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    return res.json(contact);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Add tags error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add tags' } });
  }
});

// ---------- DELETE /api/v1/contacts/:id/tags/:tag — Remove tag ---------- //
router.delete('/:id/tags/:tag', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id, tag } = req.params;

    const [contact] = await withTenantContext(tenantId, async (tx) => {
      // Fetch current tags
      const [existing] = await tx.select({ tags: schema.contacts.tags })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!existing) return [null];

      const currentTags = (existing.tags as string[]) || [];
      const filteredTags = currentTags.filter((t: string) => t !== decodeURIComponent(tag));

      return tx.update(schema.contacts)
        .set({ tags: filteredTags, updatedAt: new Date() })
        .where(eq(schema.contacts.id, id))
        .returning();
    });

    if (!contact) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
    }

    return res.json(contact);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Remove tag error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove tag' } });
  }
});

// ---------- POST /api/v1/contacts/import — Bulk import contacts ---------- //
router.post('/import', validateBody(importContactsSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { contacts: contactsData } = req.body;

    const result = await withTenantContext(tenantId, async (tx) => {
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < contactsData.length; i++) {
        const c = contactsData[i];

        // Skip duplicates based on email match
        if (c.email) {
          const [existing] = await tx.select({ id: schema.contacts.id })
            .from(schema.contacts)
            .where(and(
              eq(schema.contacts.tenantId, tenantId),
              eq(schema.contacts.email, c.email),
              isNull(schema.contacts.deletedAt),
            ))
            .limit(1);

          if (existing) {
            skipped++;
            continue;
          }
        }

        try {
          await tx.insert(schema.contacts).values({
            tenantId,
            ownerUserId: c.ownerUserId || userId,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email || null,
            emailSecondary: c.emailSecondary || null,
            phone: c.phone || null,
            phoneSecondary: c.phoneSecondary || null,
            phoneType: c.phoneType || null,
            preferredChannel: c.preferredChannel || 'email',
            company: c.company || null,
            jobTitle: c.jobTitle || null,
            mailingAddress: c.mailingAddress || null,
            mailingCity: c.mailingCity || null,
            mailingState: c.mailingState || null,
            mailingZip: c.mailingZip || null,
            birthday: c.birthday || null,
            anniversary: c.anniversary || null,
            source: c.source || null,
            sourceDetail: c.sourceDetail || null,
            contactType: c.contactType || 'lead',
            relationshipScore: c.relationshipScore ?? 50,
            leadScore: c.leadScore ?? 0,
            tags: c.tags || [],
            customFields: c.customFields || {},
            socialProfiles: c.socialProfiles || {},
            familyMembers: c.familyMembers || [],
            notes: c.notes || null,
            doNotContact: c.doNotContact ?? false,
            smsConsent: c.smsConsent ?? false,
          });
          imported++;
        } catch (insertErr: unknown) {
          const message = insertErr instanceof Error ? insertErr.message : 'Unknown error';
          errors.push(`Row ${i + 1}: ${message}`);
        }
      }

      return { imported, skipped, errors };
    });

    logAudit({
      tenantId,
      userId,
      action: 'contact.import',
      resourceType: 'contact',
      details: { imported: result.imported, skipped: result.skipped, errorCount: result.errors.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json(result);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Import contacts error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to import contacts' } });
  }
});

// ---------- POST /api/v1/contacts/:id/enroll — Enroll in follow-up sequence ---------- //
router.post('/:id/enroll', validateBody(enrollContactSchema), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { sequenceId } = req.body;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Verify contact exists
      const [contact] = await tx.select({ id: schema.contacts.id })
        .from(schema.contacts)
        .where(and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (!contact) return { error: 'CONTACT_NOT_FOUND' };

      // Verify sequence exists and is active
      const [sequence] = await tx.select()
        .from(schema.followUpSequences)
        .where(and(
          eq(schema.followUpSequences.id, sequenceId),
          eq(schema.followUpSequences.tenantId, tenantId),
          eq(schema.followUpSequences.isActive, true),
        ));

      if (!sequence) return { error: 'SEQUENCE_NOT_FOUND' };

      // Compute nextStepAt based on first step delay
      const steps = sequence.steps as Array<{ delayMinutes?: number }>;
      const firstStepDelay = steps.length > 0 && steps[0].delayMinutes
        ? steps[0].delayMinutes
        : 0;
      const nextStepAt = new Date(Date.now() + firstStepDelay * 60 * 1000);

      const [enrollment] = await tx.insert(schema.followUpEnrollments).values({
        tenantId,
        contactId: id,
        sequenceId,
        status: 'active',
        currentStep: 0,
        nextStepAt,
        enrolledBy: userId,
      }).returning();

      return { enrollment };
    });

    if ('error' in result) {
      if (result.error === 'CONTACT_NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } });
      }
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Sequence not found or inactive' } });
    }

    logAudit({
      tenantId,
      userId,
      action: 'contact.enroll',
      resourceType: 'follow_up_enrollment',
      resourceId: result.enrollment.id,
      details: { contactId: id, sequenceId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json(result.enrollment);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Enroll contact error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll contact' } });
  }
});

export default router;
