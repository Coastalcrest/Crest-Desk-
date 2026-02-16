import { pgTable, uuid, text, timestamp, decimal, varchar, boolean } from 'drizzle-orm/pg-core';

export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  vendorName: varchar('vendor_name', { length: 200 }).notNull(),
  vendorType: varchar('vendor_type', { length: 50 }).notNull(),
  contactName: varchar('contact_name', { length: 200 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 30 }),
  address: text('address'),
  paymentTerms: varchar('payment_terms', { length: 30 }).default('net_30'),
  requires1099: boolean('requires_1099').default(false),
  taxId: varchar('tax_id', { length: 20 }),
  ytdPayments: decimal('ytd_payments', { precision: 14, scale: 2 }).default('0'),
  performanceRating: decimal('performance_rating', { precision: 3, scale: 2 }),
  avgTurnaroundDays: decimal('avg_turnaround_days', { precision: 6, scale: 1 }),
  qbVendorId: varchar('qb_vendor_id', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
