import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const tenantComplianceRules = pgTable('tenant_compliance_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  category: varchar('category', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  enforcement: varchar('enforcement', { length: 20 }).notNull(),
  parameters: jsonb('parameters').default({}),
  appliesTo: text('applies_to')
    .array()
    .notNull(),
  active: boolean('active').default(true),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
