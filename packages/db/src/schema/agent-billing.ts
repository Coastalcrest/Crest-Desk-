import { pgTable, uuid, text, timestamp, decimal, date, varchar } from 'drizzle-orm/pg-core';

export const agentBilling = pgTable('agent_billing', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  agentId: uuid('agent_id').notNull(),
  billingType: varchar('billing_type', { length: 30 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  billingPeriodStart: date('billing_period_start').notNull(),
  billingPeriodEnd: date('billing_period_end').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  paidStatus: varchar('paid_status', { length: 20 }).notNull().default('pending'),
  paymentDate: date('payment_date'),
  qbInvoiceId: varchar('qb_invoice_id', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
