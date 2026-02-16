import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';

export const signingEnvelopes = pgTable(
  'signing_envelopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    envelopeName: varchar('envelope_name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    documentIds: uuid('document_ids').array().notNull().default([]),
    signingOrder: jsonb('signing_order').notNull().default([]),
    signingDeadline: timestamp('signing_deadline', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_signing_envelopes_transaction')
      .on(table.transactionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_signing_envelopes_status')
      .on(table.status)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
