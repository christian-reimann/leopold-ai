import type { JobPosting } from "../../shared/schemas/job-posting.js";
import { index, jsonb, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "../constants.js";

export const jobPostings = pgTable(
  "job_postings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dedupeHash: text("dedupe_hash").notNull().unique(),
    sourceConnector: text("source_connector").notNull(),
    rawHtml: text("raw_html"),
    data: jsonb("data").$type<JobPosting>().notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("job_postings_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);
