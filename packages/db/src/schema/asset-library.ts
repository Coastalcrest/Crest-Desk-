import { pgTable, uuid, text, timestamp, varchar, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const assetLibrary = pgTable('asset_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'restrict' }),
  category: varchar('category', { length: 50 }).notNull(),
  subcategory: varchar('subcategory', { length: 50 }),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  licenseType: varchar('license_type', { length: 50 }).notNull().default('royalty_free'),
  tags: jsonb('tags'),
  metadata: jsonb('metadata'),
  isGlobal: boolean('is_global').default(false),
  isSeasonal: boolean('is_seasonal').default(false),
  seasonalMonth: integer('seasonal_month'),
  sortOrder: integer('sort_order').default(0),
  downloadCount: integer('download_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
