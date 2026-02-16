import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { followUpSequences } from './follow-up-sequences';

export const leadSources = pgTable(
  'lead_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    sourceName: varchar('source_name', { length: 100 }).notNull(),
    sourceType: varchar('source_type', { length: 30 }).notNull(),
    isActive: boolean('is_active').default(true),
    autoResponseSequenceId: uuid('auto_response_sequence_id')
      .references(() => followUpSequences.id, { onDelete: 'restrict' }),
    leadDistributionRule: varchar('lead_distribution_rule', { length: 30 }).default('round_robin'),
    leadDistributionConfig: jsonb('lead_distribution_config').default({}),
    totalLeads: integer('total_leads').default(0),
    convertedLeads: integer('converted_leads').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_lead_sources_tenant')
      .on(table.tenantId),
    index('idx_lead_sources_type')
      .on(table.sourceType),
  ],
);
