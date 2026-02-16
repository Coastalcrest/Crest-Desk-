import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  inet,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { signingEnvelopes } from './signing-envelopes';

export const signingRequests = pgTable(
  'signing_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    envelopeId: uuid('envelope_id')
      .notNull()
      .references(() => signingEnvelopes.id, { onDelete: 'restrict' }),
    signerId: uuid('signer_id'),
    signerEmail: varchar('signer_email', { length: 255 }).notNull(),
    signerName: varchar('signer_name', { length: 255 }).notNull(),
    signerRole: varchar('signer_role', { length: 50 }).notNull(),
    signingOrder: integer('signing_order').notNull(),
    status: varchar('status', { length: 50 }).default('pending').notNull(),
    signingLink: varchar('signing_link', { length: 500 }).notNull(),
    signingLinkExpiresAt: timestamp('signing_link_expires_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    declinedReason: text('declined_reason'),
    ipAddress: inet('ip_address'),
    deviceInfo: jsonb('device_info').default({}),
    geoLocation: jsonb('geo_location'),
    requiresWitness: boolean('requires_witness').default(false),
    witnessSignerRequestId: uuid('witness_signer_request_id'),
    requiresNotary: boolean('requires_notary').default(false),
    notaryVerified: boolean('notary_verified').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_signing_requests_envelope')
      .on(table.envelopeId)
      .where(sql`${table.status} != 'archived'`),
    index('idx_signing_requests_signer')
      .on(table.signerEmail)
      .where(sql`${table.status} = 'pending'`),
    index('idx_signing_requests_link')
      .on(table.signingLink),
  ],
);
