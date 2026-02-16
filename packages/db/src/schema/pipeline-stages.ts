import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    stageName: varchar('stage_name', { length: 100 }).notNull(),
    stageOrder: integer('stage_order').notNull(),
    stageColor: varchar('stage_color', { length: 7 }).default('#6B7280'),
    isDefault: boolean('is_default').default(false),
    isClosedWon: boolean('is_closed_won').default(false),
    isClosedLost: boolean('is_closed_lost').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_stages_tenant')
      .on(table.tenantId),
    index('idx_stages_order')
      .on(table.tenantId, table.stageOrder),
  ],
);
