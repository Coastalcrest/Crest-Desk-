import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';

export const reviewQueue = pgTable(
  'review_queue',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 30 }).default('pending').notNull(),
    priority: integer('priority').default(50).notNull(),
    riskScore: integer('risk_score').default(0),
    readinessScore: integer('readiness_score').default(0),
    assignedReviewerId: uuid('assigned_reviewer_id')
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    reviewStartedAt: timestamp('review_started_at', { withTimezone: true }),
    reviewCompletedAt: timestamp('review_completed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    returnReason: text('return_reason'),
    returnedToUserId: uuid('returned_to_user_id')
      .references(() => users.id, { onDelete: 'restrict' }),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    approvalStampPath: varchar('approval_stamp_path', { length: 500 }),
    exportedAt: timestamp('exported_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_review_queue_tenant')
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_review_queue_status')
      .on(table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_review_queue_priority')
      .on(table.priority)
      .where(sql`${table.status} = 'pending'`),
    index('idx_review_queue_reviewer')
      .on(table.assignedReviewerId),
  ],
);
