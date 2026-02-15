import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const documentAuditLog = pgTable(
  'document_audit_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    documentId: uuid('document_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    actorUserId: uuid('actor_user_id'),
    details: jsonb('details').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_doc_audit_document')
      .on(table.documentId, sql`${table.createdAt} DESC`),
    index('idx_doc_audit_tenant')
      .on(table.tenantId),
  ],
);
