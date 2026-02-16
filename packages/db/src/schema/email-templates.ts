import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  agentId: uuid('agent_id'),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text'),
  variables: jsonb('variables'),
  tone: varchar('tone', { length: 30 }).default('professional'),
  isGlobal: boolean('is_global').default(false),
  usageCount: integer('usage_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
