import { pgTable, uuid, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { aiConversations } from './ai-conversations';

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'set null' }),
  ticketNumber: varchar('ticket_number', { length: 20 }).notNull(),
  subject: varchar('subject', { length: 300 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 30 }).default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  contextPage: varchar('context_page', { length: 255 }),
  contextMetadata: jsonb('context_metadata').default({}),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
