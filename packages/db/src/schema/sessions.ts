import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  inet,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { tenants } from './tenants';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    deviceInfo: jsonb('device_info').default({}),
    ipAddress: inet('ip_address').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sessions_user')
      .on(table.userId)
      .where(sql`${table.revokedAt} IS NULL`),
    index('idx_sessions_token')
      .on(table.refreshTokenHash),
  ],
);
