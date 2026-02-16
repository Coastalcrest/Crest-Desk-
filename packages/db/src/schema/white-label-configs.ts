import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const whiteLabelConfigs = pgTable('white_label_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  customDomain: varchar('custom_domain', { length: 253 }),
  customDomainVerified: boolean('custom_domain_verified').notNull().default(false),
  customDomainVerifiedAt: timestamp('custom_domain_verified_at', { withTimezone: true }),
  emailFromName: varchar('email_from_name', { length: 100 }),
  emailFromDomain: varchar('email_from_domain', { length: 253 }),
  emailReplyTo: varchar('email_reply_to', { length: 320 }),
  customCss: text('custom_css'),
  loginPageHtml: text('login_page_html'),
  faviconUrl: varchar('favicon_url', { length: 500 }),
  poweredByVisible: boolean('powered_by_visible').notNull().default(true),
  embedEnabled: boolean('embed_enabled').notNull().default(false),
  embedAllowedOrigins: text('embed_allowed_origins').array().notNull().default([]),
  sdkEnabled: boolean('sdk_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
