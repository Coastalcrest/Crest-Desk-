import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  bigint,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { transactions } from './transactions';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'restrict' }),
    documentType: varchar('document_type', { length: 100 }).notNull(),
    classificationConfidence: numeric('classification_confidence', { precision: 3, scale: 2 }),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    s3Key: varchar('s3_key', { length: 500 }).notNull().unique(),
    s3Bucket: varchar('s3_bucket', { length: 100 }).default('crestdesk-documents'),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    mimeType: varchar('mime_type', { length: 50 }).notNull(),
    isScanned: boolean('is_scanned').default(false),
    extractedData: jsonb('extracted_data').default({}),
    versionOfDocumentId: uuid('version_of_document_id'),
    isSigned: boolean('is_signed').default(false),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    isCompliant: boolean('is_compliant'),
    complianceIssues: jsonb('compliance_issues').default({}),
    folderPath: varchar('folder_path', { length: 500 }),
    uploadedBy: uuid('uploaded_by')
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_documents_tenant')
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_documents_transaction')
      .on(table.transactionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_documents_type')
      .on(table.documentType)
      .where(sql`${table.deletedAt} IS NULL`),
    index('idx_documents_s3_key')
      .on(table.s3Key),
  ],
);
