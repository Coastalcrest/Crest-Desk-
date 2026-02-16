import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { reviewFindings } from './review-findings';

export const aiReviewFeedback = pgTable(
  'ai_review_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => reviewFindings.id, { onDelete: 'restrict' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    feedbackType: varchar('feedback_type', { length: 30 }).notNull(),
    originalSeverity: varchar('original_severity', { length: 20 }),
    adjustedSeverity: varchar('adjusted_severity', { length: 20 }),
    notes: text('notes'),
    promotedToRuleId: uuid('promoted_to_rule_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_feedback_tenant')
      .on(table.tenantId),
    index('idx_feedback_finding')
      .on(table.findingId),
    index('idx_feedback_reviewer')
      .on(table.reviewerId),
  ],
);
