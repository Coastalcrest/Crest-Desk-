import { pgTable, uuid, timestamp, jsonb, text, varchar } from 'drizzle-orm/pg-core';

export const emailAiPreferences = pgTable('email_ai_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  agentId: uuid('agent_id').notNull(),
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
