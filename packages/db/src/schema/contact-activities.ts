import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { contacts } from './contacts';
import { transactions } from './transactions';
import { documents } from './documents';

export const contactActivities = pgTable(
  'contact_activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'restrict' }),
    activityType: varchar('activity_type', { length: 50 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    description: text('description'),
    metadata: jsonb('metadata').default({}),
    relatedTransactionId: uuid('related_transaction_id')
      .references(() => transactions.id, { onDelete: 'restrict' }),
    relatedDocumentId: uuid('related_document_id')
      .references(() => documents.id, { onDelete: 'restrict' }),
    channel: varchar('channel', { length: 20 }),
    direction: varchar('direction', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_activities_contact')
      .on(table.contactId),
    index('idx_activities_tenant')
      .on(table.tenantId),
    index('idx_activities_type')
      .on(table.activityType),
    index('idx_activities_created')
      .on(table.createdAt),
  ],
);
