import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

export const forms = pgTable(
  'forms',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'restrict' }),
    formKey: varchar('form_key', { length: 100 }).notNull().unique(),
    formName: varchar('form_name', { length: 255 }).notNull(),
    formType: varchar('form_type', { length: 50 }).notNull(),
    jurisdiction: varchar('jurisdiction', { length: 10 }).notNull(),
    effectiveDate: date('effective_date').notNull(),
    supersededDate: date('superseded_date'),
    htmlTemplate: text('html_template').notNull(),
    jsonSchema: jsonb('json_schema').notNull(),
    requiredFields: text('required_fields').array().notNull().default([]),
    conditionalFields: jsonb('conditional_fields').default({}),
    clauseLibrary: jsonb('clause_library').default({}),
    version: integer('version').default(1),
    isSystemForm: boolean('is_system_form').default(false),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_forms_jurisdiction')
      .on(table.jurisdiction)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_forms_key')
      .on(table.formKey),
    index('idx_forms_type')
      .on(table.formType)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
