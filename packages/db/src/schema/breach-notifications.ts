import { pgTable, uuid, char, varchar, text, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { breachIncidents } from './breach-incidents';
import { users } from './users';

export const breachNotifications = pgTable('breach_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  incidentId: uuid('incident_id').notNull().references(() => breachIncidents.id, { onDelete: 'cascade' }),
  stateCode: char('state_code', { length: 2 }).notNull(),
  notificationType: varchar('notification_type', { length: 30 }).notNull().default('attorney_general'),
  deadlineDate: date('deadline_date'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: uuid('sent_by').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
