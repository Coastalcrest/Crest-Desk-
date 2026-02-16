import { z } from 'zod';
import { paginationQuery, searchQuery, uuidSchema, emailSchema } from './common';

// ------------------------------------------------------------------ //
//  Contact schemas                                                    //
// ------------------------------------------------------------------ //

export const contactTypes = ['lead', 'prospect', 'active_client', 'past_client', 'referral_partner', 'vendor', 'other'] as const;
export const preferredChannels = ['email', 'phone', 'sms', 'mail'] as const;

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: emailSchema.optional().nullable(),
  emailSecondary: emailSchema.optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  phoneSecondary: z.string().max(30).optional().nullable(),
  phoneType: z.string().max(20).optional().nullable(),
  preferredChannel: z.enum(preferredChannels).default('email'),
  company: z.string().max(255).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  mailingAddress: z.string().max(500).optional().nullable(),
  mailingCity: z.string().max(100).optional().nullable(),
  mailingState: z.string().max(2).toUpperCase().optional().nullable(),
  mailingZip: z.string().max(20).optional().nullable(),
  birthday: z.string().optional().nullable(),
  anniversary: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceDetail: z.string().max(255).optional().nullable(),
  contactType: z.enum(contactTypes).default('lead'),
  relationshipScore: z.number().int().min(0).max(100).default(50),
  leadScore: z.number().int().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
  socialProfiles: z.record(z.string()).default({}),
  familyMembers: z.array(z.record(z.unknown())).default([]),
  notes: z.string().optional().nullable(),
  nextFollowUpAt: z.string().datetime({ offset: true }).optional().nullable(),
  doNotContact: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  smsConsentDate: z.string().optional().nullable(),
  ownerUserId: uuidSchema.optional(),
});

export const updateContactSchema = createContactSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' },
);

export const listContactsQuery = paginationQuery.merge(searchQuery).extend({
  contactType: z.string().optional(),
  source: z.string().optional(),
  tag: z.string().optional(),
  ownerId: uuidSchema.optional(),
  sortBy: z.enum(['name', 'lastContacted', 'leadScore', 'createdAt']).default('createdAt'),
});

export const addTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1)).min(1, 'tags must be a non-empty array of strings'),
});

export const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1),
      email: emailSchema.optional().nullable(),
      emailSecondary: emailSchema.optional().nullable(),
      phone: z.string().optional().nullable(),
      phoneSecondary: z.string().optional().nullable(),
      phoneType: z.string().optional().nullable(),
      preferredChannel: z.enum(preferredChannels).optional(),
      company: z.string().optional().nullable(),
      jobTitle: z.string().optional().nullable(),
      mailingAddress: z.string().optional().nullable(),
      mailingCity: z.string().optional().nullable(),
      mailingState: z.string().optional().nullable(),
      mailingZip: z.string().optional().nullable(),
      birthday: z.string().optional().nullable(),
      anniversary: z.string().optional().nullable(),
      source: z.string().optional().nullable(),
      sourceDetail: z.string().optional().nullable(),
      contactType: z.enum(contactTypes).optional(),
      relationshipScore: z.number().optional(),
      leadScore: z.number().optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.record(z.unknown()).optional(),
      socialProfiles: z.record(z.string()).optional(),
      familyMembers: z.array(z.record(z.unknown())).optional(),
      notes: z.string().optional().nullable(),
      doNotContact: z.boolean().optional(),
      smsConsent: z.boolean().optional(),
      ownerUserId: uuidSchema.optional(),
    }),
  ).min(1, 'contacts must be a non-empty array'),
});

export const logActivitySchema = z.object({
  activityType: z.string().trim().min(1, 'activityType is required'),
  subject: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  channel: z.string().max(50).optional().nullable(),
  direction: z.enum(['inbound', 'outbound']).optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
  relatedTransactionId: uuidSchema.optional().nullable(),
  relatedDocumentId: uuidSchema.optional().nullable(),
});

export const enrollContactSchema = z.object({
  sequenceId: uuidSchema,
});
