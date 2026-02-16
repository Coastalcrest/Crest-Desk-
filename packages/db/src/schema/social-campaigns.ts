import { pgTable, uuid, varchar, text, jsonb, boolean, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const socialCampaigns = pgTable('social_campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  createdBy: uuid('created_by').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  campaignType: varchar('campaign_type', { length: 50 }).notNull(),
  platforms: jsonb('platforms').default([]),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  isEvergreen: boolean('is_evergreen').default(false),
  contentStrategy: jsonb('content_strategy').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
