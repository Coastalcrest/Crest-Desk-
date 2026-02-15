import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    propertyAddress: text('property_address').notNull(),
    propertyState: varchar('property_state', { length: 2 }).notNull(),
    buyerName: varchar('buyer_name', { length: 255 }),
    sellerName: varchar('seller_name', { length: 255 }),
    listPrice: numeric('list_price', { precision: 12, scale: 2 }),
    purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }),
    closingDate: date('closing_date'),
    transactionType: varchar('transaction_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_transactions_tenant')
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_transactions_state')
      .on(table.propertyState)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_transactions_status')
      .on(table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_transactions_created_by')
      .on(table.createdBy)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
