import {
  pgTable,
  uuid,
  varchar,
  boolean,
  inet,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { documents } from './documents';
import { signingRequests } from './signing-requests';
import { signatureFields } from './signature-fields';

export const signatures = pgTable(
  'signatures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    signingRequestId: uuid('signing_request_id')
      .notNull()
      .references(() => signingRequests.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'restrict' }),
    signatureFieldId: uuid('signature_field_id')
      .references(() => signatureFields.id, { onDelete: 'restrict' }),
    signerName: varchar('signer_name', { length: 255 }).notNull(),
    signatureImagePath: varchar('signature_image_path', { length: 500 }).notNull(),
    signatureHash: varchar('signature_hash', { length: 255 }).notNull(),
    signerIpAddress: inet('signer_ip_address').notNull(),
    signingTimestamp: timestamp('signing_timestamp', { withTimezone: true }).notNull(),
    tamperSeal: varchar('tamper_seal', { length: 500 }).notNull(),
    certificateOfCompletionId: uuid('certificate_of_completion_id'),
    authenticationMethod: varchar('authentication_method', { length: 50 }).notNull(),
    biometricType: varchar('biometric_type', { length: 50 }),
    offlineSignature: boolean('offline_signature').default(false),
    syncVerifiedAt: timestamp('sync_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_signatures_document')
      .on(table.documentId),
    index('idx_signatures_request')
      .on(table.signingRequestId),
  ],
);
