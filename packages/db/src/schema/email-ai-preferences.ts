import { pgTable, uuid, timestamp, jsonb, text, varchar } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const emailAiPreferences = pgTable('email_ai_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  agentId: uuid('agent_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  writingStyle: jsonb('writing_style'),
  tonePreferences: jsonb('tone_preferences'),
  signatureHtml: text('signature_html'),
  signatureText: text('signature_text'),
  defaultTone: varchar('default_tone', { length: 30 }).default('professional'),
  autoSuggest: jsonb('auto_suggest'),
  learnedPatterns: jsonb('learned_patterns'),
  preferredGreetings: jsonb('preferred_greetings'),
  preferredClosings: jsonb('preferred_closings'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
