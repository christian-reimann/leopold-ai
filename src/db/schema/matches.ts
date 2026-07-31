import { jsonb, pgTable, real, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { MatchReasoning } from '@/shared/schemas/match';
import { jobPostings } from './job-postings';

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobPostings.id, { onDelete: 'cascade' }),
    scoreMeToJob: real('score_me_to_job').notNull(),
    reasoning: jsonb('reasoning').$type<MatchReasoning>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('matches_job_id_idx').on(table.jobId)],
);
