import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }),
    emailSecondary: varchar('email_secondary', { length: 255 }),
    phone: varchar('phone', { length: 30 }),
    phoneSecondary: varchar('phone_secondary', { length: 30 }),
    phoneType: varchar('phone_type', { length: 20 }),
    preferredChannel: varchar('preferred_channel', { length: 20 }).default('email'),
    company: varchar('company', { length: 255 }),
    jobTitle: varchar('job_title', { length: 100 }),
    mailingAddress: text('mailing_address'),
    mailingCity: varchar('mailing_city', { length: 100 }),
    mailingState: varchar('mailing_state', { length: 2 }),
    mailingZip: varchar('mailing_zip', { length: 10 }),
    birthday: date('birthday'),
    anniversary: date('anniversary'),
    source: varchar('source', { length: 50 }),
    sourceDetail: varchar('source_detail', { length: 255 }),
    contactType: varchar('contact_type', { length: 30 }).default('lead').notNull(),
    relationshipScore: integer('relationship_score').default(50),
    leadScore: integer('lead_score').default(0),
    tags: jsonb('tags').default([]),
    customFields: jsonb('custom_fields').default({}),
    socialProfiles: jsonb('social_profiles').default({}),
    familyMembers: jsonb('family_members').default([]),
    notes: text('notes'),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
    doNotContact: boolean('do_not_contact').default(false),
    smsConsent: boolean('sms_consent').default(false),
    smsConsentDate: timestamp('sms_consent_date', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_contacts_tenant')
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_contacts_owner')
      .on(table.ownerUserId),
    index('idx_contacts_email')
      .on(table.email),
    index('idx_contacts_phone')
      .on(table.phone),
    index('idx_contacts_type')
      .on(table.contactType),
    index('idx_contacts_source')
      .on(table.source),
    index('idx_contacts_next_followup')
      .on(table.nextFollowUpAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
