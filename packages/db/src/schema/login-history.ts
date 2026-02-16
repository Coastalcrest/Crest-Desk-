import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { sessions } from './sessions';

export const loginHistory = pgTable('login_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginMethod: varchar('login_method', { length: 20 }).notNull().default('password'),
  success: boolean('success').notNull().default(false),
  failureReason: varchar('failure_reason', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
  geoLocation: jsonb('geo_location').default({}),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
