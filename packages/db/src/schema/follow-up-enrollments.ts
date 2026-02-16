import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { contacts } from './contacts';
import { followUpSequences } from './follow-up-sequences';

export const followUpEnrollments = pgTable(
  'follow_up_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    sequenceId: uuid('sequence_id')
      .notNull()
      .references(() => followUpSequences.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    currentStep: integer('current_step').default(0).notNull(),
    nextStepAt: timestamp('next_step_at', { withTimezone: true }),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
    enrolledBy: uuid('enrolled_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: varchar('cancel_reason', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_enrollments_contact')
      .on(table.contactId),
    index('idx_enrollments_sequence')
      .on(table.sequenceId),
    index('idx_enrollments_status')
      .on(table.status)
      .where(sql`${table.status} = 'active'`),
    index('idx_enrollments_next_step')
      .on(table.nextStepAt)
      .where(sql`${table.status} = 'active'`),
  ],
);
