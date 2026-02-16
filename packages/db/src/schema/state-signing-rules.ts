import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const stateSigningRules = pgTable(
  'state_signing_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jurisdiction: varchar('jurisdiction', { length: 2 }).notNull(),
    ruleCategory: varchar('rule_category', { length: 100 }).notNull(),
    documentType: varchar('document_type', { length: 100 }).notNull(),
    requiresWitness: boolean('requires_witness').default(false),
    witnessCount: integer('witness_count').default(0),
    requiresNotary: boolean('requires_notary').default(false),
    remoteNotaryAllowed: boolean('remote_notary_allowed').default(false),
    requiresWetSignature: boolean('requires_wet_signature').default(false),
    eSignatureAllowed: boolean('e_signature_allowed').default(true),
    signerConsentRequired: boolean('signer_consent_required').default(true),
    recordRetentionYears: integer('record_retention_years').default(5),
    details: jsonb('details').default({}),
    effectiveDate: date('effective_date').notNull(),
    supersededDate: date('superseded_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_state_signing_rules_jurisdiction')
      .on(table.jurisdiction, table.documentType),
  ],
);
