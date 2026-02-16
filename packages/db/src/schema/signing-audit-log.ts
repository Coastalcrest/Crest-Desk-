import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  inet,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const signingAuditLog = pgTable(
  'signing_audit_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    signingRequestId: uuid('signing_request_id').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    details: jsonb('details').default({}),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_signing_audit_request')
      .on(table.signingRequestId, sql`${table.createdAt} DESC`),
    index('idx_signing_audit_tenant')
      .on(table.tenantId),
  ],
);
