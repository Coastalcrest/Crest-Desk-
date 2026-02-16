import { z } from 'zod';
import { paginationQuery, uuidSchema, stateCode } from './common';

// ------------------------------------------------------------------ //
//  Compliance schemas                                                 //
// ------------------------------------------------------------------ //

export const contentTypes = ['social_post', 'email', 'document', 'listing', 'advertisement', 'website'] as const;
export const enforcementLevels = ['critical', 'warning', 'info'] as const;

export const complianceCheckSchema = z.object({
  content: z.string().trim().min(1, 'Content is required'),
  contentType: z.enum(contentTypes),
  jurisdiction: stateCode.optional(),
  transactionId: uuidSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const createRuleSchema = z.object({
  jurisdiction: z.string().max(5).optional().nullable(),
  category: z.string().trim().min(1, 'Category is required').max(100),
  subcategory: z.string().max(100).optional().nullable(),
  ruleKey: z.string().trim().min(1, 'Rule key is required').max(100),
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  enforcementLevel: z.enum(enforcementLevels).default('warning'),
  sourceReference: z.string().max(500).optional().nullable(),
  effectiveDate: z.string().date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const listRulesQuery = paginationQuery.extend({
  jurisdiction: z.string().optional(),
  category: z.string().optional(),
  enforcementLevel: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
