import { jsonb, pgTable, real, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { MatchReasoning } from '@/shared/schemas/match';
import { jobPostings } from './job-postings';
import { profiles } from './profiles';

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobPostings.id, { onDelete: 'cascade' }),
    scoreMeToJob: real('score_me_to_job').notNull(),
    reasoning: jsonb('reasoning').$type<MatchReasoning>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('matches_profile_id_job_id_idx').on(table.profileId, table.jobId)],
);
