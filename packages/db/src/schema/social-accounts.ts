import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  agentId: uuid('agent_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  platform: varchar('platform', { length: 30 }).notNull(),
  accountType: varchar('account_type', { length: 30 }).notNull().default('personal'),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  profileUrl: text('profile_url'),
  avatarUrl: text('avatar_url'),
  scopes: jsonb('scopes').default([]),
  connectionStatus: varchar('connection_status', { length: 30 }).notNull().default('active'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
