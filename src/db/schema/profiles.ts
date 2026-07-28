import { PROFILE_SOURCES, PROFILE_STATUSES, type Profile } from '@/shared/schemas/profile';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const profileSourceEnum = pgEnum('profile_source', PROFILE_SOURCES);
export const profileStatusEnum = pgEnum('profile_status', PROFILE_STATUSES);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: jsonb('data').$type<Profile>(),
  source: profileSourceEnum('source').notNull(),
  status: profileStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
