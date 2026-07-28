import { NOTIFICATION_INTERVALS, type SearchCriteria } from '@/shared/schemas/search-query';
import { boolean, jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const notificationIntervalEnum = pgEnum('notification_interval', NOTIFICATION_INTERVALS);

export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  criteria: jsonb('criteria').$type<SearchCriteria>().notNull(),
  interval: notificationIntervalEnum('interval').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
