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

export const commissionStructures = pgTable(
  "commission_structures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    agentId: uuid("agent_id")
      .references(() => users.id, { onDelete: "restrict" }),
    dealType: varchar("deal_type", { length: 30 }),
    brokeragePercentage: numeric("brokerage_percentage", { precision: 5, scale: 2 }).notNull(),
    agentPercentage: numeric("agent_percentage", { precision: 5, scale: 2 }).notNull(),
    referralFeeFlat: numeric("referral_fee_flat", { precision: 12, scale: 2 }).default("0"),
    referralFeePercentage: numeric("referral_fee_percentage", { precision: 5, scale: 2 }).default("0"),
    franchiseFeePercentage: numeric("franchise_fee_percentage", { precision: 5, scale: 2 }).default("0"),
    effectiveDate: date("effective_date").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_commission_structures_tenant")
      .on(table.tenantId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_commission_structures_agent")
      .on(table.agentId),
    index("idx_commission_structures_effective")
      .on(table.effectiveDate),
  ],
);
