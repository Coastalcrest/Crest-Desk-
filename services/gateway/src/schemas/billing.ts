import { z } from 'zod';
import { paginationQuery, uuidSchema, dateString } from './common';

// ------------------------------------------------------------------ //
//  Billing schemas                                                    //
// ------------------------------------------------------------------ //

export const billingTypes = ['desk_fee', 'transaction_fee', 'monthly_fee', 'e_and_o', 'technology_fee', 'marketing_fee', 'other'] as const;
export const paidStatuses = ['unpaid', 'paid', 'partial', 'overdue', 'waived'] as const;

export const createBillingSchema = z.object({
  agentId: uuidSchema,
  billingType: z.enum(billingTypes),
  description: z.string().trim().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive'),
  invoiceDate: dateString,
  dueDate: dateString,
  transactionId: uuidSchema.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateBillingSchema = z.object({
  description: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
  dueDate: dateString.optional(),
  paidStatus: z.enum(paidStatuses).optional(),
  paidDate: dateString.optional().nullable(),
  paidAmount: z.number().positive().optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  paymentReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const listBillingQuery = paginationQuery.extend({
  agentId: uuidSchema.optional(),
  billingType: z.string().optional(),
  paidStatus: z.string().optional(),
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
});

export const markPaidSchema = z.object({
  paidDate: dateString,
  paidAmount: z.number().positive('Paid amount must be positive'),
  paymentMethod: z.string().trim().min(1).max(50),
  paymentReference: z.string().max(255).optional().nullable(),
});

export const generateInvoicesSchema = z.object({
  agentIds: z.array(uuidSchema).min(1, 'At least one agent ID is required'),
  invoiceDate: dateString,
  dueDate: dateString,
  billingTypes: z.array(z.enum(billingTypes)).optional(),
});
