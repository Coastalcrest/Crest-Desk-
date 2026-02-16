import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  agentId: uuid('agent_id').notNull(),
  platform: varchar('platform', { length: 30 }).notNull(),
  accountType: varchar('account_type', { length: 30 }).notNull().default('personal'),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountId: varchar('account_id', { length: 200 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes'),
  profileUrl: text('profile_url'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  connectionHealth: varchar('connection_health', { length: 20 }).default('healthy'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
