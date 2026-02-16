import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';

export const closingPackages = pgTable(
  'closing_packages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'restrict' }),
    packageName: varchar('package_name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    assembledBy: uuid('assembled_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    documentOrder: uuid('document_order').array().notNull().default([]),
    tableOfContents: text('table_of_contents').notNull().default(''),
    packagePdfPath: varchar('package_pdf_path', { length: 500 }),
    packageZipPath: varchar('package_zip_path', { length: 500 }),
    complianceChecklistId: uuid('compliance_checklist_id'),
    readyForClosing: boolean('ready_for_closing').default(false),
    submittedToTitleCompany: boolean('submitted_to_title_company').default(false),
    submissionTimestamp: timestamp('submission_timestamp', { withTimezone: true }),
    finalApprovalBy: uuid('final_approval_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    finalApprovalAt: timestamp('final_approval_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_closing_packages_transaction')
      .on(table.transactionId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
