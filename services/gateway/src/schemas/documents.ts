import { z } from 'zod';
import { paginationQuery, searchQuery, uuidSchema } from './common';

// ------------------------------------------------------------------ //
//  Document schemas                                                   //
// ------------------------------------------------------------------ //

export const uploadDocumentSchema = z.object({
  transactionId: uuidSchema.optional(),
  documentType: z.string().trim().min(1, 'documentType is required').max(100),
  name: z.string().trim().min(1, 'Document name is required').max(500),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  documentType: z.string().max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  transactionId: uuidSchema.optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const listDocumentsQuery = paginationQuery.merge(searchQuery).extend({
  transactionId: uuidSchema.optional(),
  documentType: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'documentType']).default('createdAt'),
});
