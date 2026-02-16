import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { contacts } from './contacts';
import { transactions } from './transactions';
import { pipelineStages } from './pipeline-stages';

export const deals = pgTable(
  'deals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'restrict' }),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    pipelineStageId: uuid('pipeline_stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    dealName: varchar('deal_name', { length: 255 }).notNull(),
    dealValue: numeric('deal_value', { precision: 12, scale: 2 }),
    expectedCloseDate: date('expected_close_date'),
    probability: integer('probability').default(50),
    dealType: varchar('deal_type', { length: 30 }),
    propertyAddress: text('property_address'),
    propertyState: varchar('property_state', { length: 2 }),
    notes: text('notes'),
    lostReason: varchar('lost_reason', { length: 255 }),
    wonAt: timestamp('won_at', { withTimezone: true }),
    lostAt: timestamp('lost_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_deals_tenant')
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_deals_contact')
      .on(table.contactId),
    index('idx_deals_stage')
      .on(table.pipelineStageId),
    index('idx_deals_owner')
      .on(table.ownerUserId),
    index('idx_deals_expected_close')
      .on(table.expectedCloseDate),
  ],
);
