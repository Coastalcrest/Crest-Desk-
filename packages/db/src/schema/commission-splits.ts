import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { deals } from "./deals";
import { transactions } from "./transactions";

export const commissionSplits = pgTable(
  "commission_splits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "restrict" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    transactionId: uuid("transaction_id")
      .references(() => transactions.id, { onDelete: "restrict" }),
    salePrice: numeric("sale_price", { precision: 14, scale: 2 }).notNull(),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull(),
    totalCommission: numeric("total_commission", { precision: 12, scale: 2 }).notNull(),
    brokerageAmount: numeric("brokerage_amount", { precision: 12, scale: 2 }).notNull(),
    agentAmount: numeric("agent_amount", { precision: 12, scale: 2 }).notNull(),
    referralFee: numeric("referral_fee", { precision: 12, scale: 2 }).default("0"),
    franchiseFee: numeric("franchise_fee", { precision: 12, scale: 2 }).default("0"),
    netAgentAmount: numeric("net_agent_amount", { precision: 12, scale: 2 }).notNull(),
    dealType: varchar("deal_type", { length: 30 }),
    closingDate: date("closing_date"),
    status: varchar("status", { length: 30 }).default("pending").notNull(),
    correctedFromId: uuid("corrected_from_id"),
    correctionReason: text("correction_reason"),
    qbSyncDate: timestamp("qb_sync_date", { withTimezone: true }),
    qbInvoiceId: varchar("qb_invoice_id", { length: 100 }),
    qbAccountCode: varchar("qb_account_code", { length: 50 }),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_commission_splits_tenant")
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_commission_splits_deal")
      .on(table.dealId),
    index("idx_commission_splits_agent")
      .on(table.agentId),
    index("idx_commission_splits_status")
      .on(table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_commission_splits_closing_date")
      .on(table.closingDate),
    index("idx_commission_splits_qb_sync")
      .on(table.qbSyncDate)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
