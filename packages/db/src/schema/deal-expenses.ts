import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { deals } from "./deals";

export const dealExpenses = pgTable(
  "deal_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "restrict" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id"),
    expenseCategory: varchar("expense_category", { length: 50 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    receiptDate: date("receipt_date"),
    paymentDate: date("payment_date"),
    paidStatus: varchar("paid_status", { length: 30 }).default("unpaid").notNull(),
    receiptUrl: varchar("receipt_url", { length: 500 }),
    taxDeductible: boolean("tax_deductible").default(false),
    irsCategoryCode: varchar("irs_category_code", { length: 20 }),
    qbSyncDate: timestamp("qb_sync_date", { withTimezone: true }),
    qbExpenseId: varchar("qb_expense_id", { length: 100 }),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_deal_expenses_tenant")
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_deal_expenses_deal")
      .on(table.dealId),
    index("idx_deal_expenses_agent")
      .on(table.agentId),
    index("idx_deal_expenses_category")
      .on(table.expenseCategory)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_deal_expenses_paid_status")
      .on(table.paidStatus)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_deal_expenses_receipt_date")
      .on(table.receiptDate),
  ],
);
