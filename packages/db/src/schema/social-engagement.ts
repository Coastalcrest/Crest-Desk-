import { pgTable, uuid, timestamp, varchar, integer, jsonb } from 'drizzle-orm/pg-core';

export const socialEngagement = pgTable('social_engagement', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  postId: uuid('post_id').notNull(),
  platform: varchar('platform', { length: 30 }).notNull(),
  impressions: integer('impressions').default(0),
  reach: integer('reach').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  saves: integer('saves').default(0),
  clicks: integer('clicks').default(0),
  videoViews: integer('video_views').default(0),
  engagementRate: varchar('engagement_rate', { length: 10 }),
  leadsGenerated: integer('leads_generated').default(0),
  platformMetrics: jsonb('platform_metrics'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
