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

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: uuid('resource_id'),
    details: jsonb('details').default({}),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_audit_tenant_time')
      .on(table.tenantId, sql`${table.createdAt} DESC`),
    index('idx_audit_resource')
      .on(table.resourceType, table.resourceId),
  ],
);
