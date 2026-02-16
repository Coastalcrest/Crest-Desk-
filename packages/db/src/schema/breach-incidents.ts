import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const breachIncidents = pgTable('breach_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  incidentNumber: varchar('incident_number', { length: 20 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 30 }).notNull().default('detected'),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  containedAt: timestamp('contained_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  affectedRecordsCount: integer('affected_records_count').default(0),
  affectedStates: text('affected_states').array().default([]),
  dataTypesExposed: text('data_types_exposed').array().default([]),
  rootCause: text('root_cause'),
  remediationSteps: text('remediation_steps'),
  reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
