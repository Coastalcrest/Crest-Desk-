import { pgTable, uuid, text, timestamp, varchar, jsonb, integer, boolean, date } from 'drizzle-orm/pg-core';

export const socialCampaigns = pgTable('social_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  agentId: uuid('agent_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  campaignType: varchar('campaign_type', { length: 50 }).notNull(),
  platforms: jsonb('platforms').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  postCount: integer('post_count').default(0),
  publishedCount: integer('published_count').default(0),
  totalImpressions: integer('total_impressions').default(0),
  totalEngagement: integer('total_engagement').default(0),
  isEvergreen: boolean('is_evergreen').default(false),
  contentStrategy: jsonb('content_strategy'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
