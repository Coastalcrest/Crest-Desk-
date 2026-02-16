import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const agentMediaPreferences = pgTable('agent_media_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  agentId: uuid('agent_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  preferredStyles: jsonb('preferred_styles'),
  preferredMusicMood: jsonb('preferred_music_mood'),
  colorPreferences: jsonb('color_preferences'),
  brandingDefaults: jsonb('branding_defaults'),
  learnedFromEdits: jsonb('learned_from_edits'),
  favoriteTemplateIds: jsonb('favorite_template_ids'),
  favoriteAssetIds: jsonb('favorite_asset_ids'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
