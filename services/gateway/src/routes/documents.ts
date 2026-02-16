import { Router, Request, Response } from 'express';
import { eq, and, isNull, desc, ilike, sql, or } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../lib/audit';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const router = Router();
router.use(requireAuth);

// Helper: generate S3 key
function generateS3Key(tenantId: string, transactionId: string | null, filename: string): string {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString('hex');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (transactionId) {
    return `${tenantId}/${transactionId}/${timestamp}_${hash}_${safeName}`;
  }
  return `${tenantId}/unlinked/${timestamp}_${hash}_${safeName}`;
}

// POST /api/v1/documents/upload — Upload document metadata (file upload handled by S3 presigned URL)
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const {
      originalFilename, fileSizeBytes, mimeType, transactionId,
      documentType, s3Key, folderPath,
    } = req.body;

    if (!originalFilename || !fileSizeBytes || !mimeType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'originalFilename, fileSizeBytes, and mimeType are required' } });
    }

    const key = s3Key || generateS3Key(tenantId, transactionId, originalFilename);

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.documents).values({
        tenantId,
        transactionId: transactionId || null,
        documentType: documentType || 'unclassified',
        originalFilename,
        s3Key: key,
        fileSizeBytes,
        mimeType,
        folderPath: folderPath || null,
        uploadedBy: userId,
      }).returning();
    });

    // Log the upload
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.documentAuditLog).values({
        tenantId,
        documentId: doc.id,
        action: 'upload',
        actorUserId: userId,
        details: { originalFilename, mimeType, fileSizeBytes },
      });
    });

    logAudit({ tenantId, userId, action: 'document.upload', resourceType: 'document', resourceId: doc.id, details: { originalFilename }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(201).json(doc);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Upload document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upload document' } });
  }
});

// GET /api/v1/documents/upload-url — Get S3 presigned upload URL
router.get('/upload-url', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const filename = req.query.filename as string;
    const transactionId = req.query.transactionId as string;

    if (!filename) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'filename is required' } });
    }

    const key = generateS3Key(tenantId, transactionId || null, filename);

    // In production, this would use AWS SDK to generate presigned URL
    // For now, return the key that the client will use
    return res.json({
      uploadUrl: `https://${process.env.S3_BUCKET || 'crestdesk-documents'}.s3.amazonaws.com/${key}`,
      s3Key: key,
      expiresIn: 300, // 5 minutes
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Generate upload URL error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate upload URL' } });
  }
});

// GET /api/v1/documents — List documents with pagination and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const transactionId = req.query.transactionId as string;
    const documentType = req.query.documentType as string;
    const isCompliant = req.query.isCompliant as string;
    const isSigned = req.query.isSigned as string;

    const conditions = [
      eq(schema.documents.tenantId, tenantId),
      isNull(schema.documents.deletedAt),
    ];

    if (transactionId) conditions.push(eq(schema.documents.transactionId, transactionId));
    if (documentType) conditions.push(eq(schema.documents.documentType, documentType));
    if (isCompliant === 'true') conditions.push(eq(schema.documents.isCompliant, true));
    if (isCompliant === 'false') conditions.push(eq(schema.documents.isCompliant, false));
    if (isSigned === 'true') conditions.push(eq(schema.documents.isSigned, true));
    if (isSigned === 'false') conditions.push(eq(schema.documents.isSigned, false));

    const [docs, [{ total }]] = await withTenantContext(tenantId, async (tx) => {
      const results = await tx.select().from(schema.documents)
        .where(and(...conditions))
        .orderBy(desc(schema.documents.createdAt))
        .limit(limit)
        .offset(offset);

      const countResult = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.documents)
        .where(and(...conditions));

      return [results, countResult];
    });

    return res.json({ data: docs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error({ err, tenantId }, 'List documents error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' } });
  }
});

// GET /api/v1/documents/search — Full-text search documents
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const q = req.query.q as string;
    const transactionId = req.query.transactionId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);

    if (!q) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' } });
    }

    const conditions = [
      eq(schema.documents.tenantId, tenantId),
      isNull(schema.documents.deletedAt),
      or(
        ilike(schema.documents.originalFilename, `%${q}%`),
        ilike(schema.documents.documentType, `%${q}%`),
        sql`${schema.documents.extractedData}::text ILIKE ${'%' + q + '%'}`,
      ),
    ];

    if (transactionId) conditions.push(eq(schema.documents.transactionId, transactionId));

    const docs = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.documents)
        .where(and(...conditions))
        .orderBy(desc(schema.documents.createdAt))
        .limit(limit);
    });

    return res.json({ data: docs, total: docs.length });
  } catch (err) {
    logger.error({ err, tenantId }, 'Search documents error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search documents' } });
  }
});

// GET /api/v1/documents/transaction/:txnId — List documents for a transaction
router.get('/transaction/:txnId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { txnId } = req.params;

    const docs = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.documents)
        .where(and(
          eq(schema.documents.tenantId, tenantId),
          eq(schema.documents.transactionId, txnId),
          isNull(schema.documents.deletedAt),
        ))
        .orderBy(desc(schema.documents.createdAt));
    });

    return res.json({ data: docs });
  } catch (err) {
    logger.error({ err, tenantId }, 'List transaction documents error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' } });
  }
});

// GET /api/v1/documents/:id — Get document by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.documents)
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // Log view
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.documentAuditLog).values({
        tenantId,
        documentId: id,
        action: 'view',
        actorUserId: userId,
      });
    });

    return res.json(doc);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Get document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get document' } });
  }
});

// GET /api/v1/documents/:id/download — Get presigned download URL
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.select().from(schema.documents)
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    // In production, generate presigned S3 download URL
    const downloadUrl = `https://${doc.s3Bucket}.s3.amazonaws.com/${doc.s3Key}`;

    // Log download
    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.documentAuditLog).values({
        tenantId,
        documentId: id,
        action: 'download',
        actorUserId: userId,
      });
    });

    return res.json({ downloadUrl, expiresIn: 300, filename: doc.originalFilename });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Download document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate download URL' } });
  }
});

// PATCH /api/v1/documents/:id — Update document metadata
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    const allowedFields = ['documentType', 'transactionId', 'folderPath', 'isSigned', 'isCompliant', 'classificationConfidence', 'extractedData', 'complianceIssues'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'classificationConfidence') {
          updates[field] = req.body[field]?.toString() || null;
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } });
    }

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.documents)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ))
        .returning();
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    logAudit({ tenantId, userId, action: 'document.update', resourceType: 'document', resourceId: id, details: updates, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.json(doc);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Update document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update document' } });
  }
});

// POST /api/v1/documents/:id/classify — Manually classify document
router.post('/:id/classify', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { documentType, confidence } = req.body;

    if (!documentType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'documentType is required' } });
    }

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.documents)
        .set({
          documentType,
          classificationConfidence: confidence?.toString() || '1.00',
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ))
        .returning();
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.documentAuditLog).values({
        tenantId,
        documentId: id,
        action: 'classify',
        actorUserId: userId,
        details: { documentType, confidence, manual: true },
      });
    });

    return res.json(doc);
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Classify document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to classify document' } });
  }
});

// POST /api/v1/documents/:id/tag — Add tag to document
router.post('/:id/tag', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;
    const { tagKey, tagValue } = req.body;

    if (!tagKey) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'tagKey is required' } });
    }

    // Verify document exists
    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.select({ id: schema.documents.id }).from(schema.documents)
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const [tag] = await withTenantContext(tenantId, async (tx) => {
      return tx.insert(schema.documentTags).values({
        tenantId,
        documentId: id,
        tagKey,
        tagValue: tagValue || null,
      }).returning();
    });

    return res.status(201).json(tag);
  } catch (err) {
    logger.error({ err, tenantId }, 'Add tag error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add tag' } });
  }
});

// DELETE /api/v1/documents/:id — Soft-delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const [doc] = await withTenantContext(tenantId, async (tx) => {
      return tx.update(schema.documents)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.documents.id, id),
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ))
        .returning();
    });

    if (!doc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    await withTenantContext(tenantId, async (tx) => {
      await tx.insert(schema.documentAuditLog).values({
        tenantId,
        documentId: id,
        action: 'delete',
        actorUserId: userId,
      });
    });

    logAudit({ tenantId, userId, action: 'document.delete', resourceType: 'document', resourceId: id, details: {}, ipAddress: req.ip, userAgent: req.headers['user-agent'] });

    return res.status(204).send();
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Delete document error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' } });
  }
});

export default router;
