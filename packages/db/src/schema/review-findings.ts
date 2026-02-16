import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';
import { documents } from './documents';
import { reviewQueue } from './review-queue';

export const reviewFindings = pgTable(
  'review_findings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    reviewQueueId: uuid('review_queue_id')
      .notNull()
      .references(() => reviewQueue.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    source: varchar('source', { length: 30 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'restrict' }),
    ruleReference: varchar('rule_reference', { length: 255 }),
    jurisdiction: varchar('jurisdiction', { length: 10 }),
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id')
      .references(() => users.id, { onDelete: 'restrict' }),
    brokerAction: varchar('broker_action', { length: 30 }),
    brokerActionAt: timestamp('broker_action_at', { withTimezone: true }),
    brokerNotes: text('broker_notes'),
    aiConfidence: numeric('ai_confidence', { precision: 3, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_findings_review')
      .on(table.reviewQueueId),
    index('idx_findings_transaction')
      .on(table.transactionId),
    index('idx_findings_severity')
      .on(table.severity)
      .where(sql`${table.resolved} = false`),
    index('idx_findings_source')
      .on(table.source),
  ],
);
