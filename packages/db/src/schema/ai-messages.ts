import { pgTable, uuid, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { aiConversations } from './ai-conversations';

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'restrict' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 30 }).default('text'),
  metadata: jsonb('metadata').default({}),
  feedbackRating: integer('feedback_rating'),
  feedbackComment: text('feedback_comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
