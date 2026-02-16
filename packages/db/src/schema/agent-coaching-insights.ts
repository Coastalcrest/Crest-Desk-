import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const agentCoachingInsights = pgTable(
  'agent_coaching_insights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    agentUserId: uuid('agent_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    insightType: varchar('insight_type', { length: 50 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    description: text('description').notNull(),
    occurrenceCount: integer('occurrence_count').default(1).notNull(),
    lastOccurrence: timestamp('last_occurrence', { withTimezone: true }).defaultNow(),
    exampleTransactionIds: jsonb('example_transaction_ids').default([]),
    reminderSent: boolean('reminder_sent').default(false),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    dismissed: boolean('dismissed').default(false),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_coaching_agent')
      .on(table.agentUserId),
    index('idx_coaching_tenant')
      .on(table.tenantId),
    index('idx_coaching_type')
      .on(table.insightType),
  ],
);
