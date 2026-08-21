import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

const TABLES = [
  'messages',
  'conversations',
  'applications',
  'matches',
  'search_queries',
  'document_chunks',
  'documents',
  'job_postings',
  'profiles',
] as const;

/** Clears all tables between integration tests - the testcontainer DB is shared
 * across the whole test run (see vitest.integration.globalsetup.ts). */
export async function truncateAll(): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`));
}
