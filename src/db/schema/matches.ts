import { jsonb, pgTable, real, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { jobPostings } from "./job-postings.js";
import { searchQueries } from "./search-queries.js";

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobPostings.id, { onDelete: "cascade" }),
    searchQueryId: uuid("search_query_id")
      .notNull()
      .references(() => searchQueries.id, { onDelete: "cascade" }),
    scoreJobToMe: real("score_job_to_me").notNull(),
    scoreMeToJob: real("score_me_to_job").notNull(),
    reasoning: jsonb("reasoning"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matches_job_search_query_idx").on(table.jobId, table.searchQueryId),
  ],
);
