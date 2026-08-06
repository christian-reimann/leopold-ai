import { PROFILE_STATUSES, type Profile } from '@/shared/schemas/profile';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import { EMBEDDING_DIMENSIONS } from '@/db/constants';

export const profileStatusEnum = pgEnum('profile_status', PROFILE_STATUSES);

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  data: jsonb('data').$type<Profile>(),
  status: profileStatusEnum('status').notNull().default('pending'),
  error: text('error'),
  embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
