import { pgTable, uuid, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const socialEngagement = pgTable('social_engagement', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  postId: uuid('post_id').notNull(),
  platform: varchar('platform', { length: 30 }).notNull(),
  impressions: integer('impressions').default(0),
  reach: integer('reach').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  clicks: integer('clicks').default(0),
  saves: integer('saves').default(0),
  videoViews: integer('video_views').default(0),
  engagementRate: varchar('engagement_rate', { length: 20 }),
  demographics: jsonb('demographics').default({}),
  metadata: jsonb('metadata').default({}),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
