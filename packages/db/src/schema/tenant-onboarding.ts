import { pgTable, uuid, varchar, char, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantOnboarding = pgTable('tenant_onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().unique().references(() => tenants.id, { onDelete: 'cascade' }),
  currentStep: varchar('current_step', { length: 50 }).notNull().default('account_created'),
  stepsCompleted: text('steps_completed').array().notNull().default([]),
  brokerageName: varchar('brokerage_name', { length: 255 }),
  primaryState: char('primary_state', { length: 2 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  teamSizeEstimate: varchar('team_size_estimate', { length: 20 }),
  referralSource: varchar('referral_source', { length: 100 }),
  onboardingStartedAt: timestamp('onboarding_started_at', { withTimezone: true }).notNull().defaultNow(),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
