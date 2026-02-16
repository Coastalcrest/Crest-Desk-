import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const router = Router();

// ─── Helper: Generate a secure signing link token ─────────────────
function generateSigningToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Envelope Management (Authenticated) ──────────────────────────

router.use(requireAuth);

// POST /api/v1/signing/envelopes — Create signing envelope
router.post('/envelopes', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, envelopeName, documentIds, signingOrder, signingDeadline } = req.body;

    if (!transactionId || !envelopeName || !documentIds?.length || !signingDeadline) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'transactionId, envelopeName, documentIds, and signingDeadline are required' } });
    }

    const [envelope] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.signingEnvelopes).values({
        tenantId,
        transactionId,
        envelopeName,
        documentIds,
        signingOrder: signingOrder || [],
        signingDeadline: new Date(signingDeadline),
        createdBy: userId,
        status: 'draft',
      }).returning();
    });

    logAudit({ tenantId, userId, action: 'envelope.created', resourceType: 'signing_envelope', resourceId: envelope.id, details: { envelopeName, documentCount: documentIds.length }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    // Log to signing audit
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.signingAuditLog).values({
        tenantId,
        signingRequestId: envelope.id,
        action: 'envelope_created',
        details: { envelopeName, documentIds },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    return res.status(201).json({ data: envelope });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Create envelope error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create signing envelope' } });
  }
});

// POST /api/v1/signing/envelopes/:envelopeId/send — Send envelope to signers
router.post('/envelopes/:envelopeId/send', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { envelopeId } = req.params;
    const { signers } = req.body;

    if (!signers?.length) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'signers array is required' } });
    }

    // Verify envelope exists and is draft
    const [envelope] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signingEnvelopes)
        .where(and(eq(schema.signingEnvelopes.id, envelopeId), eq(schema.signingEnvelopes.tenantId, tenantId)));
    });

    if (!envelope) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Envelope not found' } });
    }

    // Get transaction for state compliance
    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.transactions)
        .where(eq(schema.transactions.id, envelope.transactionId));
    });

    // Check state signing rules
    const stateRules = await db.select().from(schema.stateSigningRules)
      .where(eq(schema.stateSigningRules.jurisdiction, txn?.propertyState || 'US'));

    const signingRequests = [];

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const token = generateSigningToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Check if witness/notary required based on state rules
      const applicableRules = stateRules.filter(r => r.signerConsentRequired);
      const requiresWitness = applicableRules.some(r => r.requiresWitness);
      const requiresNotary = applicableRules.some(r => r.requiresNotary);

      const [request] = await withTenantContext(tenantId, async (tx) => {
        return tx.insert(schema.signingRequests).values({
          tenantId,
          envelopeId,
          signerEmail: signer.email,
          signerName: signer.name,
          signerRole: signer.role || 'signer',
          signingOrder: i + 1,
          status: 'pending',
          signingLink: token,
          signingLinkExpiresAt: expiresAt,
          sentAt: new Date(),
          requiresWitness,
          requiresNotary,
        }).returning();
      });

      signingRequests.push(request);

      // Log send event
      await withTenantContext(tenantId, async (tx) => {
        await tx.insert(schema.signingAuditLog).values({
          tenantId,
          signingRequestId: request.id,
          action: 'link_sent',
          details: { signerEmail: signer.email, signerRole: signer.role },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      });
    }

    // Update envelope status to sent
    await withTenantContext(tenantId, async (tx) => {
      await tx.update(schema.signingEnvelopes)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(eq(schema.signingEnvelopes.id, envelopeId));
    });

    logAudit({ tenantId, userId, action: 'envelope.sent', resourceType: 'signing_envelope', resourceId: envelopeId, details: { signerCount: signers.length }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ data: { envelope_id: envelopeId, status: 'sent', signing_requests: signingRequests.map(r => ({ id: r.id, signer_email: r.signerEmail, status: r.status, sent_at: r.sentAt })) } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Send envelope error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send envelope' } });
  }
});

// GET /api/v1/signing/envelopes/:envelopeId — Get envelope with signer status
router.get('/envelopes/:envelopeId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { envelopeId } = req.params;

    const [envelope] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signingEnvelopes)
        .where(and(eq(schema.signingEnvelopes.id, envelopeId), eq(schema.signingEnvelopes.tenantId, tenantId)));
    });

    if (!envelope) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Envelope not found' } });
    }

    const requests = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signingRequests)
        .where(eq(schema.signingRequests.envelopeId, envelopeId))
        .orderBy(schema.signingRequests.signingOrder);
    });

    return res.json({ data: { ...envelope, signing_requests: requests } });
  } catch (err) {
    logger.error({ err, tenantId }, 'Get envelope error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get envelope' } });
  }
});

// GET /api/v1/signing/envelopes — List envelopes for a transaction
router.get('/envelopes', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const transactionId = req.query.transactionId as string;

    const conditions = [
      eq(schema.signingEnvelopes.tenantId, tenantId),
      isNull(schema.signingEnvelopes.deletedAt),
    ];

    if (transactionId) {
      conditions.push(eq(schema.signingEnvelopes.transactionId, transactionId));
    }

    const envelopes = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signingEnvelopes)
        .where(and(...conditions))
        .orderBy(desc(schema.signingEnvelopes.createdAt));
    });

    return res.json({ data: envelopes });
  } catch (err) {
    logger.error({ err, tenantId }, 'List envelopes error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list envelopes' } });
  }
});

// POST /api/v1/signing/envelopes/:envelopeId/remind — Send reminder
router.post('/envelopes/:envelopeId/remind', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { envelopeId } = req.params;
    const { signerIds, message } = req.body;

    const requests = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signingRequests)
        .where(and(
          eq(schema.signingRequests.envelopeId, envelopeId),
          eq(schema.signingRequests.tenantId, tenantId),
          eq(schema.signingRequests.status, 'pending'),
        ));
    });

    const toRemind = signerIds
      ? requests.filter(r => signerIds.includes(r.id))
      : requests;

    for (const request of toRemind) {
      await withTenantContext(tenantId, async (tx) => {
        await tx.insert(schema.signingAuditLog).values({
          tenantId,
          signingRequestId: request.id,
          action: 'reminder_sent',
          details: { message: message || 'Reminder to sign documents' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      });
    }

    logAudit({ tenantId, userId, action: 'envelope.reminder_sent', resourceType: 'signing_envelope', resourceId: envelopeId, details: { emailsSent: toRemind.length }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ success: true, emails_sent: toRemind.length });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Send reminder error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send reminder' } });
  }
});

// POST /api/v1/signing/envelopes/:envelopeId/add-witness — Add witness
router.post('/envelopes/:envelopeId/add-witness', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { envelopeId } = req.params;
    const { signingRequestId, witnessEmail, witnessName } = req.body;

    if (!signingRequestId || !witnessEmail || !witnessName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'signingRequestId, witnessEmail, and witnessName are required' } });
    }

    const token = generateSigningToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [witnessRequest] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.signingRequests).values({
        tenantId,
        envelopeId,
        signerEmail: witnessEmail,
        signerName: witnessName,
        signerRole: 'witness',
        signingOrder: 99,
        status: 'pending',
        signingLink: token,
        signingLinkExpiresAt: expiresAt,
        sentAt: new Date(),
      }).returning();
    });

    // Link witness to original signer
    await withTenantContext(tenantId, async (tx) => {
      await tx.update(schema.signingRequests)
        .set({ witnessSignerRequestId: witnessRequest.id })
        .where(eq(schema.signingRequests.id, signingRequestId));
    });

    logAudit({ tenantId, userId, action: 'witness.added', resourceType: 'signing_request', resourceId: signingRequestId, details: { witnessEmail }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ success: true, witness_request_id: witnessRequest.id });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Add witness error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add witness' } });
  }
});

// GET /api/v1/signing/state-rules/:state — Get signing rules for a state
router.get('/state-rules/:state', async (req: Request, res: Response) => {
  try {
    const state = req.params.state.toUpperCase();

    const rules = await db.select().from(schema.stateSigningRules)
      .where(and(
        eq(schema.stateSigningRules.jurisdiction, state),
        isNull(schema.stateSigningRules.supersededDate),
      ));

    return res.json({ data: { jurisdiction: state, rules } });
  } catch (err) {
    logger.error({ err }, 'Get state rules error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get state signing rules' } });
  }
});

export default router;
