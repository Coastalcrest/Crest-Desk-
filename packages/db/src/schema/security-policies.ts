import { pgTable, uuid, integer, boolean, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const securityPolicies = pgTable('security_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  minPasswordLength: integer('min_password_length').notNull().default(12),
  requireUppercase: boolean('require_uppercase').notNull().default(true),
  requireLowercase: boolean('require_lowercase').notNull().default(true),
  requireNumbers: boolean('require_numbers').notNull().default(true),
  requireSpecialChars: boolean('require_special_chars').notNull().default(true),
  maxPasswordAgeDays: integer('max_password_age_days').notNull().default(90),
  passwordHistoryCount: integer('password_history_count').notNull().default(5),
  sessionTimeoutMinutes: integer('session_timeout_minutes').notNull().default(480),
  maxConcurrentSessions: integer('max_concurrent_sessions').notNull().default(5),
  mfaRequiredRoles: text('mfa_required_roles').array().notNull().default(['{owner,principal_broker}']),
  ipAllowlistEnabled: boolean('ip_allowlist_enabled').notNull().default(false),
  lockoutThreshold: integer('lockout_threshold').notNull().default(5),
  lockoutDurationMinutes: integer('lockout_duration_minutes').notNull().default(30),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
