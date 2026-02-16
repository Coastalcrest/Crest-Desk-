import { pgTable, uuid, char, varchar, integer, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const breachNotificationRules = pgTable('breach_notification_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  stateCode: char('state_code', { length: 2 }).notNull().unique(),
  stateName: varchar('state_name', { length: 100 }).notNull(),
  notificationDeadlineDays: integer('notification_deadline_days'),
  attorneyGeneralRequired: boolean('attorney_general_required').notNull().default(false),
  consumerReportingRequired: boolean('consumer_reporting_required').notNull().default(false),
  thresholdIndividuals: integer('threshold_individuals'),
  statuteReference: varchar('statute_reference', { length: 255 }),
  notificationUrl: text('notification_url'),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
