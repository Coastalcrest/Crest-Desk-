import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const complianceRules = pgTable(
  'compliance_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jurisdiction: varchar('jurisdiction', { length: 10 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    subcategory: varchar('subcategory', { length: 100 }).notNull(),
    ruleKey: varchar('rule_key', { length: 200 }).unique().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    enforcement: varchar('enforcement', { length: 20 }).notNull(),
    parameters: jsonb('parameters').default({}),
    appliesTo: text('applies_to')
      .array()
      .notNull(),
    effectiveDate: date('effective_date').notNull(),
    supersededDate: date('superseded_date'),
    version: integer('version').default(1),
    sourceReference: text('source_reference'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_compliance_jurisdiction')
      .on(table.jurisdiction, table.category),
    index('idx_compliance_key')
      .on(table.ruleKey),
  ],
);
