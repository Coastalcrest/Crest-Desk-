import { z } from 'zod';
import { paginationQuery, uuidSchema, dateString } from './common';

// ------------------------------------------------------------------ //
//  Commission schemas                                                 //
// ------------------------------------------------------------------ //

export const splitTypes = ['percentage', 'flat', 'graduated'] as const;

export const createSplitSchema = z.object({
  transactionId: uuidSchema,
  agentId: uuidSchema,
  splitType: z.enum(splitTypes).default('percentage'),
  agentPercentage: z.number().min(0).max(100).optional(),
  brokeragePercentage: z.number().min(0).max(100).optional(),
  flatAmount: z.number().positive().optional().nullable(),
  grossCommission: z.number().positive('Gross commission is required'),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateSplitSchema = z.object({
  splitType: z.enum(splitTypes).optional(),
  agentPercentage: z.number().min(0).max(100).optional(),
  brokeragePercentage: z.number().min(0).max(100).optional(),
  flatAmount: z.number().positive().optional().nullable(),
  grossCommission: z.number().positive().optional(),
  status: z.enum(['pending', 'approved', 'paid', 'disputed']).optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const calculateCommissionSchema = z.object({
  transactionId: uuidSchema,
  purchasePrice: z.number().positive('Purchase price is required'),
  commissionRate: z.number().min(0).max(100, 'Commission rate must be 0-100'),
  splits: z.array(z.object({
    agentId: uuidSchema,
    percentage: z.number().min(0).max(100),
  })).min(1, 'At least one agent split is required'),
});

export const listSplitsQuery = paginationQuery.extend({
  transactionId: uuidSchema.optional(),
  agentId: uuidSchema.optional(),
  status: z.string().optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});
