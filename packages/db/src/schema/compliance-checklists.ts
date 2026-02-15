import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { transactions } from './transactions';

export const complianceChecklists = pgTable(
  'compliance_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .unique()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    jurisdiction: varchar('jurisdiction', { length: 10 }).notNull(),
    checklistItems: jsonb('checklist_items').notNull().default([]),
    status: varchar('status', { length: 20 }).default('in_progress').notNull(),
    federalItemsComplete: boolean('federal_items_complete').default(false),
    stateItemsComplete: boolean('state_items_complete').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_checklists_transaction')
      .on(table.transactionId),
    index('idx_checklists_jurisdiction')
      .on(table.jurisdiction),
  ],
);
