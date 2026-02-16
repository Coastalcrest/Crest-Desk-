import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  integer,
  inet,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { signingEnvelopes } from './signing-envelopes';
import { documents } from './documents';

export const certificatesOfCompletion = pgTable(
  'certificates_of_completion',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    envelopeId: uuid('envelope_id')
      .references(() => signingEnvelopes.id, { onDelete: 'restrict' }),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'restrict' }),
    signerName: varchar('signer_name', { length: 255 }).notNull(),
    signerEmail: varchar('signer_email', { length: 255 }).notNull(),
    signingTimestamp: timestamp('signing_timestamp', { withTimezone: true }).notNull(),
    signingLocationIp: inet('signing_location_ip').notNull(),
    signingDeviceInfo: jsonb('signing_device_info').notNull(),
    jurisdiction: varchar('jurisdiction', { length: 2 }).notNull(),
    complianceRulesVersion: integer('compliance_rules_version').notNull(),
    certificatePdfPath: varchar('certificate_pdf_path', { length: 500 }).notNull(),
    certificateHash: varchar('certificate_hash', { length: 255 }).notNull(),
    issuedBySystem: boolean('issued_by_system').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_certificates_envelope')
      .on(table.envelopeId),
    index('idx_certificates_document')
      .on(table.documentId),
  ],
);
