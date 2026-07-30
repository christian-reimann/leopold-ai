import type { JobPosting } from '@/shared/schemas/job-posting';
import { type AnyPgColumn, index, jsonb, pgTable, text, timestamp, unique, uuid, vector } from 'drizzle-orm/pg-core';
import { EMBEDDING_DIMENSIONS } from '@/db/constants';

export const jobPostings = pgTable(
  'job_postings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Dedup-Ebene 1: dieselbe Quelle liefert dieselbe Stelle erneut (Re-Poll) → Update statt Duplikat.
    sourceConnector: text('source_connector').notNull(),
    sourceId: text('source_id').notNull(),
    // Grober Content-Hash als billiger Kandidaten-Vorfilter für Dedup-Ebene 2 (kein Unique-Constraint
    // mehr – exakte Content-Kollisionen über verschiedene Quellen sind gewollte, verlinkte Duplikate,
    // kein Insert-Konflikt).
    dedupeHash: text('dedupe_hash').notNull(),
    // Dedup-Ebene 2: quellenübergreifendes Near-Duplicate via Embedding-Ähnlichkeit. Zeile bleibt
    // erhalten (eigene rawHtml/data pro Quelle), verweist aber auf die zuerst gesehene Stelle.
    // Matching/UI filtern auf `duplicateOfId IS NULL`.
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
