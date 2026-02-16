import { z } from 'zod';
import { paginationQuery, searchQuery, stateCode, dateString } from './common';

// ------------------------------------------------------------------ //
//  Transaction schemas                                                //
// ------------------------------------------------------------------ //

export const transactionTypes = ['buy', 'sell', 'lease', 'investment'] as const;
export const transactionStatuses = ['draft', 'active', 'pending', 'under_contract', 'closed', 'cancelled', 'expired'] as const;

export const createTransactionSchema = z.object({
  propertyAddress: z.string().trim().min(1, 'Property address is required'),
  propertyState: stateCode,
  transactionType: z.enum(transactionTypes, {
    errorMap: () => ({ message: `transactionType must be one of: ${transactionTypes.join(', ')}` }),
  }),
  buyerName: z.string().max(255).optional().nullable(),
  sellerName: z.string().max(255).optional().nullable(),
  listPrice: z.number().positive().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  closingDate: dateString.optional().nullable(),
});

export const updateTransactionSchema = z.object({
  propertyAddress: z.string().trim().min(1).optional(),
  propertyState: stateCode.optional(),
  transactionType: z.enum(transactionTypes).optional(),
  buyerName: z.string().max(255).optional().nullable(),
  sellerName: z.string().max(255).optional().nullable(),
  listPrice: z.number().positive().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  closingDate: dateString.optional().nullable(),
  status: z.enum(transactionStatuses).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const listTransactionsQuery = paginationQuery.merge(searchQuery).extend({
  status: z.string().optional(),
  state: z.string().length(2).toUpperCase().optional(),
});
