import { z } from 'zod';
import { paginationQuery, searchQuery, uuidSchema } from './common';

// ------------------------------------------------------------------ //
//  Form schemas                                                       //
// ------------------------------------------------------------------ //

export const createFormSchema = z.object({
  name: z.string().trim().min(1, 'Form name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  state: z.string().length(2).toUpperCase().optional().nullable(),
  formSchema: z.record(z.unknown()).default({}),
  pdfTemplateUrl: z.string().url().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const submitFormInstanceSchema = z.object({
  formId: uuidSchema,
  transactionId: uuidSchema.optional(),
  fieldValues: z.record(z.unknown()).default({}),
  status: z.enum(['draft', 'submitted', 'completed']).default('submitted'),
});

export const listFormsQuery = paginationQuery.merge(searchQuery).extend({
  category: z.string().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  isActive: z.coerce.boolean().optional(),
});
