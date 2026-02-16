import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { contacts } from './contacts';
import { followUpEnrollments } from './follow-up-enrollments';

export const followUpMessages = pgTable(
  'follow_up_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => followUpEnrollments.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    stepNumber: integer('step_number').notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    body: text('body'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    failureReason: varchar('failure_reason', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_messages_enrollment')
      .on(table.enrollmentId),
    index('idx_messages_contact')
      .on(table.contactId),
    index('idx_messages_status')
      .on(table.status),
    index('idx_messages_sent')
      .on(table.sentAt),
  ],
);
