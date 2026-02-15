import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { documents } from './documents';

export const documentTags = pgTable(
  'document_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    tagKey: varchar('tag_key', { length: 100 }).notNull(),
    tagValue: varchar('tag_value', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_document_tags_document')
      .on(table.documentId),
    index('idx_document_tags_tenant')
      .on(table.tenantId),
  ],
);
