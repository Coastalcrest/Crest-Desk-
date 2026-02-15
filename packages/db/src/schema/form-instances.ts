import {
  pgTable,
  uuid,
  jsonb,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';
import { forms } from './forms';

export const formInstances = pgTable(
  'form_instances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    filledData: jsonb('filled_data').notNull().default({}),
    isComplete: boolean('is_complete').default(false),
    isSentForSignature: boolean('is_sent_for_signature').default(false),
    signatureRequestId: uuid('signature_request_id'),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_form_instances_transaction')
      .on(table.transactionId),
    index('idx_form_instances_form')
      .on(table.formId),
  ],
);
