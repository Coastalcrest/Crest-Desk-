import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';

export const socialContentRules = pgTable('social_content_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  postType: varchar('post_type', { length: 50 }),
  platform: varchar('platform', { length: 30 }),
  requiresBrokerApproval: boolean('requires_broker_approval').default(false),
  autoPublish: boolean('auto_publish').default(false),
  complianceTemplate: text('compliance_template'),
  hashtagDefaults: jsonb('hashtag_defaults'),
  brandingRequirements: jsonb('branding_requirements'),
  schedulingRules: jsonb('scheduling_rules'),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
