import { pgTable, uuid, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  source: varchar('source', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }),
  contextType: varchar('context_type', { length: 50 }),
  contextId: uuid('context_id'),
  contextPage: varchar('context_page', { length: 255 }),
  contextMetadata: jsonb('context_metadata').default({}),
  status: varchar('status', { length: 20 }).default('active'),
  messageCount: integer('message_count').default(0),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
