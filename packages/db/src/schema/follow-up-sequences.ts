import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';

export const followUpSequences = pgTable(
  'follow_up_sequences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    sequenceName: varchar('sequence_name', { length: 255 }).notNull(),
    sequenceType: varchar('sequence_type', { length: 30 }).notNull(),
    description: text('description'),
    triggerEvent: varchar('trigger_event', { length: 100 }),
    isActive: boolean('is_active').default(true),
    isSystemDefault: boolean('is_system_default').default(false),
    steps: jsonb('steps').notNull().default([]),
    targetContactTypes: jsonb('target_contact_types').default([]),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sequences_tenant')
      .on(table.tenantId),
    index('idx_sequences_type')
      .on(table.sequenceType),
    index('idx_sequences_active')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ],
);
