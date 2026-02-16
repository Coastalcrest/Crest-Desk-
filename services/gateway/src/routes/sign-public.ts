import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../lib/db';
import * as schema from '../lib/schema';
import crypto from 'crypto';

const router = Router();

// Helper: look up signing request by token
async function findRequestByToken(token: string) {
  const [request] = await db.select().from(schema.signingRequests)
    .where(eq(schema.signingRequests.signingLink, token));
  return request;
}

// Helper: generate HMAC tamper seal
function generateTamperSeal(documentHash: string, signatureHash: string): string {
  const secret = process.env.ESIGN_SEAL_SECRET || 'crestdesk-dev-seal-secret';
  return crypto.createHmac('sha256', secret)
    .update(documentHash + signatureHash)
    .digest('hex');
}

// Helper: verify tamper seal
function verifyTamperSeal(documentHash: string, signatureHash: string, seal: string): boolean {
  const expected = generateTamperSeal(documentHash, signatureHash);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(seal));
}

// GET /api/v1/sign/:token — Load signing page data
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = await findRequestByToken(token);

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing link not found or expired' } });
    }

    if (new Date() > request.signingLinkExpiresAt) {
      return res.status(410).json({ error: { code: 'EXPIRED', message: 'This signing link has expired. Contact your agent for a new link.' } });
    }

    if (request.status === 'signed') {
      return res.status(400).json({ error: { code: 'ALREADY_SIGNED', message: 'You have already signed these documents.' } });
    }

    // Get envelope
    const [envelope] = await db.select().from(schema.signingEnvelopes)
      .where(eq(schema.signingEnvelopes.id, request.envelopeId));

    if (!envelope) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing envelope not found' } });
    }

    // Get documents
    const documents = [];
    for (const docId of envelope.documentIds) {
      const [doc] = await db.select().from(schema.documents)
        .where(eq(schema.documents.id, docId));
      if (doc) {
        // Get signature fields for this signer on this document
        const fields = await db.select().from(schema.signatureFields)
          .where(and(
            eq(schema.signatureFields.documentId, docId),
            eq(schema.signatureFields.signingRequestId, request.id),
          ));

        documents.push({
          id: doc.id,
          name: doc.originalFilename,
          type: doc.documentType,
          previewUrl: `https://${doc.s3Bucket}.s3.amazonaws.com/${doc.s3Key}`,
          signatureFields: fields.map(f => ({
            id: f.id,
            page: f.pageNumber,
            fieldType: f.fieldType,
            x: f.xCoordinate,
            y: f.yCoordinate,
            width: f.width,
            height: f.height,
            required: f.required,
            placeholder: f.placeholderText,
            status: f.status,
          })),
        });
      }
    }

    // Get transaction for context
    const [txn] = await db.select().from(schema.transactions)
      .where(eq(schema.transactions.id, envelope.transactionId));

    return res.json({
      data: {
        signing_session: {
          request_id: request.id,
          envelope_name: envelope.envelopeName,
          signer_name: request.signerName,
          signer_role: request.signerRole,
          signing_deadline: envelope.signingDeadline,
          requires_witness: request.requiresWitness,
          requires_notary: request.requiresNotary,
        },
        documents,
        transaction_summary: txn ? {
          property_address: txn.propertyAddress,
          property_state: txn.propertyState,
          buyer_name: txn.buyerName,
          seller_name: txn.sellerName,
          purchase_price: txn.purchasePrice,
          closing_date: txn.closingDate,
        } : null,
        compliance_notice: request.requiresWitness
          ? 'This document requires a witness signature per state law.'
          : null,
      },
    });
  } catch (err) {
    console.error('Load signing page error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load signing page' } });
  }
});

// POST /api/v1/sign/:token/mark-as-opened — Track when signer opens page
router.post('/:token/mark-as-opened', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = await findRequestByToken(token);

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing link not found' } });
    }

    if (!request.openedAt) {
      await db.update(schema.signingRequests)
        .set({ openedAt: new Date(), status: 'in_progress', updatedAt: new Date() })
        .where(eq(schema.signingRequests.id, request.id));

      await db.insert(schema.signingAuditLog).values({
        tenantId: request.tenantId,
        signingRequestId: request.id,
        action: 'page_opened',
        details: {},
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return res.json({ success: true, opened_at: request.openedAt || new Date().toISOString() });
  } catch (err) {
    console.error('Mark as opened error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to mark as opened' } });
  }
});

// POST /api/v1/sign/:token/signature — Submit a signature
router.post('/:token/signature', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = await findRequestByToken(token);

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing link not found' } });
    }

    if (new Date() > request.signingLinkExpiresAt) {
      return res.status(410).json({ error: { code: 'EXPIRED', message: 'Signing link has expired' } });
    }

    const { documentId, signatureFieldId, signatureImage, signerName, authenticationMethod, offline } = req.body;

    if (!documentId || !signatureImage || !signerName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'documentId, signatureImage, and signerName are required' } });
    }

    // Hash the signature image
    const signatureHash = crypto.createHash('sha256').update(signatureImage).digest('hex');

    // Get document for hash
    const [doc] = await db.select().from(schema.documents)
      .where(eq(schema.documents.id, documentId));

    const documentHash = doc?.fileHash || crypto.createHash('sha256').update(documentId).digest('hex');

    // Generate tamper seal
    const tamperSeal = generateTamperSeal(documentHash, signatureHash);

    // Store signature image in S3 (path placeholder)
    const signatureImagePath = `${request.tenantId}/signatures/${request.id}/${signatureHash}.png`;

    // Create signature record
    const [signature] = await db.insert(schema.signatures).values({
      tenantId: request.tenantId,
      signingRequestId: request.id,
      documentId,
      signatureFieldId: signatureFieldId || null,
      signerName,
      signatureImagePath,
      signatureHash,
      signerIpAddress: req.ip || '0.0.0.0',
      signingTimestamp: new Date(),
      tamperSeal,
      authenticationMethod: authenticationMethod || 'password',
      offlineSignature: offline || false,
    }).returning();

    // Update signature field status if provided
    if (signatureFieldId) {
      await db.update(schema.signatureFields)
        .set({ status: 'signed', signatureImagePath, signatureTimestamp: new Date(), updatedAt: new Date() })
        .where(eq(schema.signatureFields.id, signatureFieldId));
    }

    // Audit log
    await db.insert(schema.signingAuditLog).values({
      tenantId: request.tenantId,
      signingRequestId: request.id,
      action: 'signature_submitted',
      details: { documentId, signatureFieldId, authenticationMethod, offline },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      data: {
        signature_id: signature.id,
        document_id: documentId,
        field_id: signatureFieldId,
        status: 'signed',
        tamper_seal: tamperSeal,
        signed_at: signature.signingTimestamp,
      },
    });
  } catch (err) {
    console.error('Submit signature error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit signature' } });
  }
});

// POST /api/v1/sign/:token/complete — Complete signing session
router.post('/:token/complete', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = await findRequestByToken(token);

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing link not found' } });
    }

    // Update request status to signed
    await db.update(schema.signingRequests)
      .set({ status: 'signed', signedAt: new Date(), ipAddress: req.ip, deviceInfo: { userAgent: req.headers['user-agent'] }, updatedAt: new Date() })
      .where(eq(schema.signingRequests.id, request.id));

    // Generate certificate of completion
    const certHash = crypto.createHash('sha256').update(request.id + Date.now()).digest('hex');
    const certPdfPath = `${request.tenantId}/certificates/${request.id}/${certHash}.pdf`;

    const [certificate] = await db.insert(schema.certificatesOfCompletion).values({
      tenantId: request.tenantId,
      envelopeId: request.envelopeId,
      signerName: request.signerName,
      signerEmail: request.signerEmail,
      signingTimestamp: new Date(),
      signingLocationIp: req.ip || '0.0.0.0',
      signingDeviceInfo: { userAgent: req.headers['user-agent'] },
      jurisdiction: 'US',
      complianceRulesVersion: 1,
      certificatePdfPath: certPdfPath,
      certificateHash: certHash,
    }).returning();

    // Check if all signers in envelope have signed
    const allRequests = await db.select().from(schema.signingRequests)
      .where(eq(schema.signingRequests.envelopeId, request.envelopeId));

    const allSigned = allRequests.every(r => r.status === 'signed' || r.id === request.id);

    if (allSigned) {
      await db.update(schema.signingEnvelopes)
        .set({ status: 'fully_signed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.signingEnvelopes.id, request.envelopeId));
    }

    // Audit log
    await db.insert(schema.signingAuditLog).values({
      tenantId: request.tenantId,
      signingRequestId: request.id,
      action: 'signing_completed',
      details: { certificateId: certificate.id, allEnvelopeSigned: allSigned },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      data: {
        request_id: request.id,
        status: 'signed',
        certificate_of_completion_id: certificate.id,
        envelope_fully_signed: allSigned,
        message: 'Thank you for signing! Documents have been sent to the transaction file.',
      },
    });
  } catch (err) {
    console.error('Complete signing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to complete signing' } });
  }
});

// POST /api/v1/sign/:token/decline — Decline to sign
router.post('/:token/decline', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const request = await findRequestByToken(token);

    if (!request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Signing link not found' } });
    }

    const { reason } = req.body;

    await db.update(schema.signingRequests)
      .set({ status: 'declined', declinedReason: reason || null, updatedAt: new Date() })
      .where(eq(schema.signingRequests.id, request.id));

    await db.insert(schema.signingAuditLog).values({
      tenantId: request.tenantId,
      signingRequestId: request.id,
      action: 'signing_declined',
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ success: true, status: 'declined' });
  } catch (err) {
    console.error('Decline signing error:', err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to decline signing' } });
  }
});

export default router;
