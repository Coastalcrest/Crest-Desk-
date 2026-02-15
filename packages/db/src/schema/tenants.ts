import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

// NOTE: ownerUserId references users.id, but the FK constraint is defined
// via a custom migration to avoid a circular import (users -> tenants -> users).
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  ownerUserId: uuid('owner_user_id'),
  primaryState: varchar('primary_state', { length: 2 }).notNull(),
  licensedStates: text('licensed_states')
    .array()
    .notNull()
    .default([]),
  licenseNumbers: jsonb('license_numbers').default({}),
  branding: jsonb('branding').default({}),
  settings: jsonb('settings').default({}),
  subscriptionPlan: varchar('subscription_plan', { length: 50 }).default('trial'),
  subscriptionStatus: varchar('subscription_status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
