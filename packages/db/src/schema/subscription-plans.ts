import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  planCode: varchar('plan_code', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  priceMonthlyCents: integer('price_monthly_cents').notNull().default(0),
  priceYearlyCents: integer('price_yearly_cents').notNull().default(0),
  maxUsers: integer('max_users'),
  maxTransactions: integer('max_transactions'),
  maxApiCallsPerMonth: integer('max_api_calls_per_month'),
  maxStorageMb: integer('max_storage_mb'),
  maxDocuments: integer('max_documents'),
  maxWebhookEndpoints: integer('max_webhook_endpoints').notNull().default(5),
  features: jsonb('features').notNull().default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
