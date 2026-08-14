import type { JobPosting } from '@/shared/schemas/job-posting';
import { type AnyPgColumn, index, jsonb, pgTable, text, timestamp, unique, uuid, vector } from 'drizzle-orm/pg-core';
import { EMBEDDING_DIMENSIONS } from '@/db/constants';

export const jobPostings = pgTable(
  'job_postings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Dedup level 1: the same source delivers the same posting again (re-poll) → update instead of duplicate.
    sourceConnector: text('source_connector').notNull(),
    sourceId: text('source_id').notNull(),
    // Coarse content hash as a cheap candidate pre-filter for dedup level 2 (no longer a unique
    // constraint – exact content collisions across different sources are intentional, linked
    // duplicates, not an insert conflict).
    dedupeHash: text('dedupe_hash').notNull(),
    // Dedup level 2: cross-source near-duplicate via embedding similarity. The row is kept
    // (own rawHtml/data per source), but references the first-seen posting.
    // Matching/UI filter on `duplicateOfId IS NULL`.
    duplicateOfId: uuid('duplicate_of_id').references((): AnyPgColumn => jobPostings.id),
    rawHtml: text('raw_html'),
    data: jsonb('data').$type<JobPosting>().notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('job_postings_source_unique').on(table.sourceConnector, table.sourceId),
    index('job_postings_dedupe_hash_idx').on(table.dedupeHash),
    index('job_postings_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);
