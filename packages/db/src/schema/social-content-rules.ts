import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const socialContentRules = pgTable('social_content_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  createdBy: uuid('created_by').notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  postType: varchar('post_type', { length: 50 }),
  platform: varchar('platform', { length: 30 }),
  requiresBrokerApproval: boolean('requires_broker_approval').default(false),
  autoPublish: boolean('auto_publish').default(false),
  complianceTemplate: text('compliance_template'),
  hashtagDefaults: jsonb('hashtag_defaults').default([]),
  brandingRequirements: jsonb('branding_requirements').default({}),
  schedulingRules: jsonb('scheduling_rules').default({}),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
