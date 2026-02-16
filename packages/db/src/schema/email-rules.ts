import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const emailRules = pgTable('email_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  agentId: uuid('agent_id').references(() => users.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 200 }).notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  conditions: jsonb('conditions').notNull(),
  actions: jsonb('actions').notNull(),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),
  matchCount: integer('match_count').default(0),
  lastMatchedAt: timestamp('last_matched_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
