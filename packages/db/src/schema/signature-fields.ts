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
import { documents } from './documents';
import { signingRequests } from './signing-requests';

export const signatureFields = pgTable(
  'signature_fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    signingRequestId: uuid('signing_request_id')
      .notNull()
      .references(() => signingRequests.id, { onDelete: 'restrict' }),
    fieldType: varchar('field_type', { length: 50 }).notNull(),
    pageNumber: integer('page_number').notNull(),
    xCoordinate: integer('x_coordinate').notNull(),
    yCoordinate: integer('y_coordinate').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    required: boolean('required').default(true),
    locked: boolean('locked').default(false),
    placeholderText: varchar('placeholder_text', { length: 255 }),
    status: varchar('status', { length: 50 }).default('unsigned').notNull(),
    signatureImagePath: varchar('signature_image_path', { length: 500 }),
    signatureTimestamp: timestamp('signature_timestamp', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_signature_fields_document')
      .on(table.documentId),
    index('idx_signature_fields_request')
      .on(table.signingRequestId),
  ],
);
