import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql, or } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// ─── Form Templates ───────────────────────────────────────────────

// GET /api/v1/forms — List available form templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const jurisdiction = req.query.jurisdiction as string;
    const formType = req.query.formType as string;

    const conditions = [
      isNull(schema.forms.deletedAt),
      or(
        eq(schema.forms.tenantId, tenantId),
        eq(schema.forms.isSystemForm, true),
      ),
    ];

    if (jurisdiction) conditions.push(eq(schema.forms.jurisdiction, jurisdiction.toUpperCase()));
    if (formType) conditions.push(eq(schema.forms.formType, formType));

    // System forms are not tenant-scoped, so we query without tenant context for them
    const forms = await db.select().from(schema.forms)
      .where(and(...conditions))
      .orderBy(schema.forms.jurisdiction, schema.forms.formName);

    return res.json({ data: forms });
  } catch (err) {
    logger.error({ err, tenantId }, 'List forms error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list forms' } });
  }
});

// GET /api/v1/forms/state/:state — Get forms for a specific state
router.get('/state/:state', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const state = req.params.state.toUpperCase();

    const forms = await db.select().from(schema.forms)
      .where(and(
        isNull(schema.forms.deletedAt),
        eq(schema.forms.jurisdiction, state),
        isNull(schema.forms.supersededDate),
        or(
          eq(schema.forms.tenantId, tenantId),
          eq(schema.forms.isSystemForm, true),
        ),
      ))
      .orderBy(schema.forms.formType, schema.forms.formName);

    return res.json({ data: forms });
  } catch (err) {
    logger.error({ err, tenantId }, 'List state forms error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list forms' } });
  }
});

// GET /api/v1/forms/:id — Get form template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [form] = await db.select().from(schema.forms)
      .where(and(
        eq(schema.forms.id, id),
        isNull(schema.forms.deletedAt),
        or(
          eq(schema.forms.tenantId, tenantId),
          eq(schema.forms.isSystemForm, true),
        ),
      ));

    if (!form) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form not found' } });
    }

    return res.json(form);
  } catch (err) {
    logger.error({ err, tenantId }, 'Get form error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get form' } });
  }
});

// POST /api/v1/forms — Create custom form template (Principal Broker+)
router.post('/', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      formKey, formName, formType, jurisdiction, effectiveDate,
      htmlTemplate, jsonSchema, requiredFields, conditionalFields, clauseLibrary,
    } = req.body;

    if (!formKey || !formName || !formType || !jurisdiction || !effectiveDate || !htmlTemplate || !jsonSchema) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'formKey, formName, formType, jurisdiction, effectiveDate, htmlTemplate, and jsonSchema are required' } });
    }

    const [form] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.forms).values({
        tenantId,
        formKey,
        formName,
        formType,
        jurisdiction: jurisdiction.toUpperCase(),
        effectiveDate,
        htmlTemplate,
        jsonSchema,
        requiredFields: requiredFields || [],
        conditionalFields: conditionalFields || {},
        clauseLibrary: clauseLibrary || {},
        isSystemForm: false,
        createdBy: userId,
      }).returning();
    });

    logAudit({ tenantId, userId, action: 'form.create', resourceType: 'form', resourceId: form.id, details: { formKey, formName }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json(form);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A form with this key already exists' } });
    }
    logger.error({ err, tenantId, userId }, 'Create form error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create form' } });
  }
});

// PATCH /api/v1/forms/:id — Update form template (Principal Broker+)
router.patch('/:id', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['formName', 'htmlTemplate', 'jsonSchema', 'requiredFields', 'conditionalFields', 'clauseLibrary', 'supersededDate'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [form] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.forms)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.forms.id, id),
          eq(schema.forms.tenantId, tenantId),
          eq(schema.forms.isSystemForm, false),
          isNull(schema.forms.deletedAt),
        ))
        .returning();
    });

    if (!form) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form not found or is a system form' } });
    }

    logAudit({ tenantId, userId, action: 'form.update', resourceType: 'form', resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(form);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update form error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update form' } });
  }
});

// ─── Form Instances (Filled Forms) ────────────────────────────────

// POST /api/v1/form-instances — Create filled form
router.post('/instances', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { formId, transactionId, filledData } = req.body;

    if (!formId || !transactionId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'formId and transactionId are required' } });
    }

    // Verify form exists
    const [form] = await db.select().from(schema.forms)
      .where(and(eq(schema.forms.id, formId), isNull(schema.forms.deletedAt)));

    if (!form) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form template not found' } });
    }

    const [instance] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.formInstances).values({
        tenantId,
        formId,
        transactionId,
        filledData: filledData || {},
        createdBy: userId,
      }).returning();
    });

    logAudit({ tenantId, userId, action: 'form_instance.create', resourceType: 'form_instance', resourceId: instance.id, details: { formId, transactionId }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json(instance);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create form instance error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create form instance' } });
  }
});

// GET /api/v1/form-instances/:id — Get form instance
router.get('/instances/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [instance] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.formInstances)
        .where(and(
          eq(schema.formInstances.id, id),
          eq(schema.formInstances.tenantId, tenantId),
        ));
    });

    if (!instance) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form instance not found' } });
    }

    return res.json(instance);
  } catch (err) {
    logger.error({ err, tenantId }, 'Get form instance error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get form instance' } });
  }
});

// PATCH /api/v1/form-instances/:id — Update filled data
router.patch('/instances/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { filledData, isComplete } = req.body;

    const updates: Record<string, unknown> = {};
    if (filledData !== undefined) updates.filledData = filledData;
    if (isComplete !== undefined) updates.isComplete = isComplete;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [instance] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.formInstances)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.formInstances.id, id),
          eq(schema.formInstances.tenantId, tenantId),
        ))
        .returning();
    });

    if (!instance) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form instance not found' } });
    }

    return res.json(instance);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update form instance error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update form instance' } });
  }
});

// GET /api/v1/form-instances/transaction/:txnId — Forms for a transaction
router.get('/instances/transaction/:txnId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { txnId } = req.params;

    const instances = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.formInstances)
        .where(and(
          eq(schema.formInstances.tenantId, tenantId),
          eq(schema.formInstances.transactionId, txnId),
        ))
        .orderBy(desc(schema.formInstances.createdAt));
    });

    return res.json({ data: instances });
  } catch (err) {
    logger.error({ err, tenantId }, 'List transaction form instances error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list form instances' } });
  }
});

// POST /api/v1/form-instances/:id/validate — Validate form completeness
router.post('/instances/:id/validate', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [instance] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.formInstances)
        .where(and(
          eq(schema.formInstances.id, id),
          eq(schema.formInstances.tenantId, tenantId),
        ));
    });

    if (!instance) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form instance not found' } });
    }

    // Get the form template to check required fields
    const [form] = await db.select().from(schema.forms)
      .where(eq(schema.forms.id, instance.formId));

    if (!form) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Form template not found' } });
    }

    const filledData = (instance.filledData || {}) as Record<string, unknown>;
    const requiredFields = form.requiredFields || [];
    const missingFields: string[] = [];
    const validationErrors: string[] = [];

    for (const field of requiredFields) {
      const value = filledData[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    const isComplete = missingFields.length === 0 && validationErrors.length === 0;

    // Update completion status
    if (instance.isComplete !== isComplete) {
      await withTenantContext(tenantId, async (tx) => {
        await tx.update(schema.formInstances)
          .set({ isComplete, updatedAt: new Date() })
          .where(eq(schema.formInstances.id, id));
      });
    }

    return res.json({
      id: instance.id,
      isComplete,
      missingFields,
      validationErrors,
      readyForSignature: isComplete && !instance.isSentForSignature,
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Validate form instance error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to validate form instance' } });
  }
});

export default router;
