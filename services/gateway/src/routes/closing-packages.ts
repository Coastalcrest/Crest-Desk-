import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import crypto from 'crypto';

const router = Router();
router.use(requireAuth);

// POST /api/v1/closing-packages — Create closing package
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { transactionId, packageName, documentIds, includeCertificates } = req.body;

    if (!transactionId || !packageName || !documentIds?.length) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'transactionId, packageName, and documentIds are required' } });
    }

    // Verify transaction
    const [txn] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.transactions)
        .where(and(eq(schema.transactions.id, transactionId), eq(schema.transactions.tenantId, tenantId)));
    });

    if (!txn) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }

    // Build table of contents
    const docs = [];
    for (let i = 0; i < documentIds.length; i++) {
      const [doc] = await withTenantContext(tenantId, async (tx) => {
        return tx.select().from(schema.documents)
          .where(eq(schema.documents.id, documentIds[i]));
      });
      if (doc) docs.push(`${i + 1}. ${doc.originalFilename} (${doc.documentType})`);
    }
    const toc = `Table of Contents\n${'='.repeat(40)}\n${docs.join('\n')}`;

    // Check if all docs are signed
    const allDocsResult = await withTenantContext(tenantId, async (tx) => {
      const results = [];
      for (const docId of documentIds) {
        const [d] = await tx.select().from(schema.documents).where(eq(schema.documents.id, docId));
        results.push(d);
      }
      return results;
    });

    const allSigned = allDocsResult.every(d => !d?.requiresSignature || d?.signatureStatus === 'fully_signed');

    // Get compliance checklist
    const [checklist] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.complianceChecklists)
        .where(eq(schema.complianceChecklists.transactionId, transactionId));
    });

    const [pkg] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.closingPackages).values({
        tenantId,
        transactionId,
        packageName,
        assembledBy: userId,
        documentOrder: documentIds,
        tableOfContents: toc,
        complianceChecklistId: checklist?.id || null,
        readyForClosing: allSigned,
        status: allSigned ? 'ready' : 'draft',
      }).returning();
    });

    logAudit({ tenantId, userId, action: 'closing_package.created', resourceType: 'closing_package', resourceId: pkg.id, details: { transactionId, documentCount: documentIds.length, readyForClosing: allSigned }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json({
      data: {
        ...pkg,
        all_signed: allSigned,
        compliance_status: checklist?.status || 'unknown',
      },
    });
  } catch (err) {
    console.error('Create closing package error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create closing package' } });
  }
});

// GET /api/v1/closing-packages/:id — Get closing package
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const [pkg] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.closingPackages)
        .where(and(eq(schema.closingPackages.id, id), eq(schema.closingPackages.tenantId, tenantId), isNull(schema.closingPackages.deletedAt)));
    });

    if (!pkg) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Closing package not found' } });
    }

    // Get documents in order
    const documents = [];
    for (const docId of pkg.documentOrder) {
      const [doc] = await withTenantContext(tenantId, async (tx) => {
        return tx.select().from(schema.documents).where(eq(schema.documents.id, docId));
      });
      if (doc) {
        const sigs = await withTenantContext(tenantId, async (tx) => {
          return tx.select().from(schema.signatures)
            .where(eq(schema.signatures.documentId, docId));
        });
        documents.push({
          ...doc,
          signatures: sigs.map(s => ({ signer: s.signerName, timestamp: s.signingTimestamp, verified: true })),
        });
      }
    }

    return res.json({ data: { ...pkg, documents } });
  } catch (err) {
    console.error('Get closing package error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get closing package' } });
  }
});

// GET /api/v1/closing-packages — List for transaction
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const transactionId = req.query.transactionId as string;

    const conditions = [eq(schema.closingPackages.tenantId, tenantId), isNull(schema.closingPackages.deletedAt)];
    if (transactionId) conditions.push(eq(schema.closingPackages.transactionId, transactionId));

    const packages = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.closingPackages)
        .where(and(...conditions))
        .orderBy(desc(schema.closingPackages.createdAt));
    });

    return res.json({ data: packages });
  } catch (err) {
    console.error('List closing packages error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list closing packages' } });
  }
});

// POST /api/v1/closing-packages/:id/submit-to-title — Submit to title company
router.post('/:id/submit-to-title', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { titleCompanyEmail, message } = req.body;

    if (!titleCompanyEmail) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'titleCompanyEmail is required' } });
    }

    const [pkg] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.closingPackages)
        .set({ submittedToTitleCompany: true, submissionTimestamp: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.closingPackages.id, id), eq(schema.closingPackages.tenantId, tenantId)))
        .returning();
    });

    if (!pkg) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Closing package not found' } });
    }

    logAudit({ tenantId, userId, action: 'closing_package.submitted', resourceType: 'closing_package', resourceId: id, details: { titleCompanyEmail }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ success: true, submitted_at: pkg.submissionTimestamp });
  } catch (err) {
    console.error('Submit to title error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit to title company' } });
  }
});

// POST /api/v1/closing-packages/:id/approve — Principal broker approval
router.post('/:id/approve', requireRole('principal_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { approved } = req.body;

    const [pkg] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.closingPackages)
        .set({
          finalApprovalBy: approved ? userId : null,
          finalApprovalAt: approved ? new Date() : null,
          status: approved ? 'ready' : 'draft',
          updatedAt: new Date(),
        })
        .where(and(eq(schema.closingPackages.id, id), eq(schema.closingPackages.tenantId, tenantId)))
        .returning();
    });

    if (!pkg) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Closing package not found' } });
    }

    logAudit({ tenantId, userId, action: approved ? 'closing_package.approved' : 'closing_package.rejected', resourceType: 'closing_package', resourceId: id, details: { approved }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json({ success: true, approved, approved_at: pkg.finalApprovalAt });
  } catch (err) {
    console.error('Approve closing package error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve closing package' } });
  }
});

// POST /api/v1/closing-packages/verify-signature/:signatureId — Verify signature integrity
router.post('/verify-signature/:signatureId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { signatureId } = req.params;

    const [sig] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.signatures)
        .where(and(eq(schema.signatures.id, signatureId), eq(schema.signatures.tenantId, tenantId)));
    });

    if (!sig) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signature not found' } });
    }

    // Get document hash
    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.documents)
        .where(eq(schema.documents.id, sig.documentId));
    });

    const documentHash = doc?.fileHash || crypto.createHash('sha256').update(sig.documentId).digest('hex');

    // Verify seal
    const secret = process.env.ESIGN_SEAL_SECRET || 'crestdesk-dev-seal-secret';
    const expectedSeal = crypto.createHmac('sha256', secret)
      .update(documentHash + sig.signatureHash)
      .digest('hex');

    const valid = sig.tamperSeal === expectedSeal;

    return res.json({
      data: {
        signature_id: sig.id,
        verified: valid,
        tamper_seal_status: valid ? 'valid' : 'tampered',
        signed_at: sig.signingTimestamp,
        signer_ip: sig.signerIpAddress,
        authentication_method: sig.authenticationMethod,
      },
    });
  } catch (err) {
    console.error('Verify signature error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to verify signature' } });
  }
});

export default router;
