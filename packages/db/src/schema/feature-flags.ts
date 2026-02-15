import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).unique().notNull(),
    enabled: boolean('enabled').default(false),
    tenantOverrides: jsonb('tenant_overrides').default({}),
    userOverrides: jsonb('user_overrides').default({}),
    rolloutPercentage: integer('rollout_percentage').default(0),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_feature_flags_key')
      .on(table.key),
  ],
);
