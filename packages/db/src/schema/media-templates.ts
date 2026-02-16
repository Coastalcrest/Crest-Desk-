import { pgTable, uuid, text, timestamp, varchar, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const mediaTemplates = pgTable('media_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  templateType: varchar('template_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  thumbnailPath: text('thumbnail_path'),
  templateData: jsonb('template_data').notNull(),
  defaultPrompt: text('default_prompt'),
  outputFormat: varchar('output_format', { length: 30 }),
  outputDimensions: jsonb('output_dimensions'),
  isGlobal: boolean('is_global').default(false),
  isPremium: boolean('is_premium').default(false),
  usageCount: integer('usage_count').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
