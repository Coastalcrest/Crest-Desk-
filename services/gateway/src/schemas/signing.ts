import { z } from 'zod';
import { uuidSchema, emailSchema, paginationQuery } from './common';

// ------------------------------------------------------------------ //
//  Signing schemas                                                    //
// ------------------------------------------------------------------ //

export const createEnvelopeSchema = z.object({
  transactionId: uuidSchema.optional(),
  name: z.string().trim().min(1, 'Envelope name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  documentIds: z.array(uuidSchema).min(1, 'At least one document is required'),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const addSignerSchema = z.object({
  envelopeId: uuidSchema,
  signerName: z.string().trim().min(1, 'Signer name is required').max(255),
  signerEmail: emailSchema,
  role: z.string().max(50).default('signer'),
  signingOrder: z.number().int().min(1).default(1),
  requireIdVerification: z.boolean().default(false),
});

export const submitSignatureSchema = z.object({
  signatureImage: z.string().min(1, 'Signature image data is required'),
  ipAddress: z.string().optional(),
  deviceInfo: z.string().optional(),
});

export const listEnvelopesQuery = paginationQuery.extend({
  transactionId: uuidSchema.optional(),
  status: z.enum(['draft', 'sent', 'partially_signed', 'completed', 'voided', 'expired']).optional(),
});
