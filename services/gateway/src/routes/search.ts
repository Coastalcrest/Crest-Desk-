import { Router, Request, Response } from 'express';
import { eq, and, or, isNull, desc, sql, ilike } from 'drizzle-orm';
import { db, withTenantContext } from '../lib/db';
import * as schema from '../lib/schema';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../lib/permissions';
import { logAudit } from '../lib/audit';
import { logger } from '../lib/logger';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ---------- GET /api/v1/search — Full-text search ---------- //
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const q = req.query.q as string;
    const types = req.query.types as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' } });
    }

    // Parse requested entity types
    const requestedTypes = types ? types.split(',').map((t) => t.trim()) : null;

    const results = await withTenantContext(tenantId, async (tx) => {
      // Build conditions for search_index
      const conditions = [
        eq(schema.searchIndex.tenantId, tenantId),
        or(
          sql`to_tsvector('english', coalesce(${schema.searchIndex.title}, '') || ' ' || coalesce(${schema.searchIndex.content}, '')) @@ plainto_tsquery('english', ${q})`,
          ilike(schema.searchIndex.title, `%${q}%`),
        ),
      ];

      if (requestedTypes && requestedTypes.length > 0) {
        const typeConditions = requestedTypes.map((t) => eq(schema.searchIndex.entityType, t));
        conditions.push(or(...typeConditions)!);
      }

      // Get matching results
      const rows = await tx.select()
        .from(schema.searchIndex)
        .where(and(...conditions))
        .orderBy(desc(schema.searchIndex.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` })
        .from(schema.searchIndex)
        .where(and(...conditions));

      // Group results by entity_type
      const grouped: Record<string, typeof rows> = {};
      for (const row of rows) {
        const key = row.entityType;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(row);
      }

      return { grouped, total };
    });

    // Build response with standard entity type keys
    const data: Record<string, unknown[]> = {
      transactions: results.grouped['transaction'] || [],
      contacts: results.grouped['contact'] || [],
      documents: results.grouped['document'] || [],
      deals: results.grouped['deal'] || [],
      emails: results.grouped['email'] || [],
    };

    // Include any additional entity types not in the standard set
    for (const [key, value] of Object.entries(results.grouped)) {
      const pluralKey = key.endsWith('s') ? key : `${key}s`;
      if (!data[pluralKey]) {
        data[pluralKey] = value;
      }
    }

    return res.json({
      data,
      total: results.total,
      pagination: { page, limit, total: results.total, pages: Math.ceil(results.total / limit) },
    });
  } catch (err) {
    logger.error({ err, tenantId }, 'Search error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to perform search' } });
  }
});

// ---------- GET /api/v1/search/suggestions — Type-ahead suggestions ---------- //
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const q = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' } });
    }

    const suggestions = await withTenantContext(tenantId, async (tx) => {
      return tx.select({
        id: schema.searchIndex.id,
        entityType: schema.searchIndex.entityType,
        entityId: schema.searchIndex.entityId,
        title: schema.searchIndex.title,
      }).from(schema.searchIndex)
        .where(and(
          eq(schema.searchIndex.tenantId, tenantId),
          ilike(schema.searchIndex.title, `%${q}%`),
        ))
        .orderBy(desc(schema.searchIndex.updatedAt))
        .limit(limit);
    });

    return res.json({ data: suggestions, total: suggestions.length });
  } catch (err) {
    logger.error({ err, tenantId }, 'Search suggestions error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get suggestions' } });
  }
});

// ---------- POST /api/v1/search/reindex — Rebuild search index (Managing Broker+) ---------- //
router.post('/reindex', requireRole('managing_broker'), async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = req.user!;

    const result = await withTenantContext(tenantId, async (tx) => {
      // Delete existing search index entries for this tenant
      await tx.delete(schema.searchIndex)
        .where(eq(schema.searchIndex.tenantId, tenantId));

      let indexed = 0;

      // Index transactions
      const transactions = await tx.select({
        id: schema.transactions.id,
        propertyAddress: schema.transactions.propertyAddress,
        buyerName: schema.transactions.buyerName,
        sellerName: schema.transactions.sellerName,
        transactionType: schema.transactions.transactionType,
        status: schema.transactions.status,
      }).from(schema.transactions)
        .where(and(
          eq(schema.transactions.tenantId, tenantId),
          isNull(schema.transactions.deletedAt),
        ));

      if (transactions.length > 0) {
        await tx.insert(schema.searchIndex).values(
          transactions.map((t) => ({
            tenantId,
            entityType: 'transaction',
            entityId: t.id,
            title: t.propertyAddress,
            content: [t.buyerName, t.sellerName, t.transactionType, t.status].filter(Boolean).join(' '),
            metadata: { transactionType: t.transactionType, status: t.status },
          })),
        );
        indexed += transactions.length;
      }

      // Index contacts
      const contacts = await tx.select({
        id: schema.contacts.id,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        email: schema.contacts.email,
        phone: schema.contacts.phone,
        company: schema.contacts.company,
        contactType: schema.contacts.contactType,
      }).from(schema.contacts)
        .where(and(
          eq(schema.contacts.tenantId, tenantId),
          isNull(schema.contacts.deletedAt),
        ));

      if (contacts.length > 0) {
        await tx.insert(schema.searchIndex).values(
          contacts.map((c) => ({
            tenantId,
            entityType: 'contact',
            entityId: c.id,
            title: `${c.firstName} ${c.lastName}`,
            content: [c.email, c.phone, c.company, c.contactType].filter(Boolean).join(' '),
            metadata: { contactType: c.contactType },
          })),
        );
        indexed += contacts.length;
      }

      // Index deals
      const deals = await tx.select({
        id: schema.deals.id,
        dealName: schema.deals.dealName,
        propertyAddress: schema.deals.propertyAddress,
        dealType: schema.deals.dealType,
        notes: schema.deals.notes,
      }).from(schema.deals)
        .where(and(
          eq(schema.deals.tenantId, tenantId),
          isNull(schema.deals.deletedAt),
        ));

      if (deals.length > 0) {
        await tx.insert(schema.searchIndex).values(
          deals.map((d) => ({
            tenantId,
            entityType: 'deal',
            entityId: d.id,
            title: d.dealName,
            content: [d.propertyAddress, d.dealType, d.notes].filter(Boolean).join(' '),
            metadata: { dealType: d.dealType },
          })),
        );
        indexed += deals.length;
      }

      // Index documents
      const documents = await tx.select({
        id: schema.documents.id,
        originalFilename: schema.documents.originalFilename,
        documentType: schema.documents.documentType,
        folderPath: schema.documents.folderPath,
      }).from(schema.documents)
        .where(and(
          eq(schema.documents.tenantId, tenantId),
          isNull(schema.documents.deletedAt),
        ));

      if (documents.length > 0) {
        await tx.insert(schema.searchIndex).values(
          documents.map((d) => ({
            tenantId,
            entityType: 'document',
            entityId: d.id,
            title: d.originalFilename,
            content: [d.documentType, d.folderPath].filter(Boolean).join(' '),
            metadata: { documentType: d.documentType },
          })),
        );
        indexed += documents.length;
      }

      // Index emails
      const emails = await tx.select({
        id: schema.emails.id,
        subject: schema.emails.subject,
        snippet: schema.emails.snippet,
        fromAddress: schema.emails.fromAddress,
        fromName: schema.emails.fromName,
      }).from(schema.emails)
        .where(and(
          eq(schema.emails.tenantId, tenantId),
          isNull(schema.emails.deletedAt),
        ));

      if (emails.length > 0) {
        await tx.insert(schema.searchIndex).values(
          emails.map((e) => ({
            tenantId,
            entityType: 'email',
            entityId: e.id,
            title: e.subject || '(No subject)',
            content: [e.snippet, e.fromAddress, e.fromName].filter(Boolean).join(' '),
            metadata: {},
          })),
        );
        indexed += emails.length;
      }

      return indexed;
    });

    logAudit({
      tenantId,
      userId,
      action: 'search.reindex',
      resourceType: 'search_index',
      details: { indexed: result },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({ data: { indexed: result } });
  } catch (err) {
    logger.error({ err, tenantId, userId }, 'Reindex search error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to rebuild search index' } });
  }
});

export default router;
