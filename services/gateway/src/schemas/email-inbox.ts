import { z } from 'zod';
import { paginationQuery, uuidSchema, emailSchema } from './common';

// ------------------------------------------------------------------ //
//  Email inbox schemas                                                //
// ------------------------------------------------------------------ //

export const folders = ['inbox', 'sent', 'drafts', 'starred', 'trash', 'spam', 'archive'] as const;

export const composeEmailSchema = z.object({
  accountId: uuidSchema,
  to: z.array(emailSchema).min(1, 'At least one recipient is required'),
  cc: z.array(emailSchema).default([]),
  bcc: z.array(emailSchema).default([]),
  subject: z.string().trim().min(1, 'Subject is required').max(500),
  bodyHtml: z.string().min(1, 'Email body is required'),
  bodyText: z.string().optional(),
  replyToEmailId: uuidSchema.optional().nullable(),
  contactId: uuidSchema.optional().nullable(),
  dealId: uuidSchema.optional().nullable(),
  transactionId: uuidSchema.optional().nullable(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    url: z.string().url(),
  })).default([]),
  isDraft: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const batchActionSchema = z.object({
  emailIds: z.array(uuidSchema).min(1, 'At least one email ID is required'),
  action: z.enum(['read', 'unread', 'star', 'unstar', 'archive', 'trash', 'delete', 'move']),
  targetFolder: z.enum(folders).optional(),
});

export const aiReplySchema = z.object({
  emailId: uuidSchema,
  tone: z.enum(['professional', 'friendly', 'concise', 'detailed']).default('professional'),
  additionalContext: z.string().max(1000).optional(),
});

export const listEmailsQuery = paginationQuery.extend({
  folder: z.enum(folders).default('inbox'),
  accountId: uuidSchema.optional(),
  search: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
  isStarred: z.coerce.boolean().optional(),
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
});
