import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

// Each profile has exactly one conversation, see ConversationService.getOrCreate.
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id')
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
