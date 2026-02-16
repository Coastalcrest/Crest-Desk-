import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const sdkConfigurations = pgTable('sdk_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sdkKey: varchar('sdk_key', { length: 64 }).notNull().unique(),
  environment: varchar('environment', { length: 20 }).notNull().default('production'),
  allowedOrigins: text('allowed_origins').array().notNull().default([]),
  enabledWidgets: text('enabled_widgets').array().notNull().default([]),
  themeOverrides: jsonb('theme_overrides').notNull().default({}),
  rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(60),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
