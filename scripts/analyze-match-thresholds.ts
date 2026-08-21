/**
 * Analyzes existing `matches` rows to help calibrate MATCH_PREFILTER_SIMILARITY_THRESHOLD
 * (src/core/matching/matching-service.ts).
 *
 * Caveat: this is right-censored data. Only pairs whose similarity already passed the current
 * threshold were ever judged, so there is no signal on how the judge would have scored pairs
 * below it. Use this to sanity-check the current threshold, not to justify lowering it.
 *
 * Usage:
 *   pnpm match-thresholds:analyze
 */
import { eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { matches } from '@/db/schema/matches';
import { profiles } from '@/db/schema/profiles';

const BUCKET_SIZE = 0.1;

async function main(): Promise<void> {
  // cosineDistance() only accepts a literal vector as its second argument, not another column,
  // so the pgvector `<=>` operator is used directly for this column-vs-column comparison.
  const similarity = sql<number>`1 - (${jobPostings.embedding} <=> ${profiles.embedding})`;

  const rows = await db
    .select({ similarity, scoreMeToJob: matches.scoreMeToJob, createdAt: matches.createdAt })
    .from(matches)
    .innerJoin(jobPostings, eq(matches.jobId, jobPostings.id))
    .innerJoin(profiles, eq(matches.profileId, profiles.id))
    .where(isNotNull(jobPostings.embedding));

  if (rows.length === 0) {
    console.log('No matches with embeddings found.');
    return;
  }

  console.log(`${rows.length} match(es) found.\n`);
  console.log('similarity  scoreMeToJob  createdAt');
  for (const row of [...rows].sort((a, b) => a.similarity - b.similarity)) {
    console.log(
      `${row.similarity.toFixed(3).padEnd(11)} ${String(row.scoreMeToJob).padEnd(13)} ${row.createdAt.toISOString()}`,
    );
  }

  const buckets = new Map<number, number[]>();
  for (const row of rows) {
    const bucketStart = Math.floor(row.similarity / BUCKET_SIZE) * BUCKET_SIZE;
    const scores = buckets.get(bucketStart) ?? [];
    scores.push(row.scoreMeToJob);
    buckets.set(bucketStart, scores);
  }

  console.log('\nbucket        n   avg    min    max');
  for (const bucketStart of [...buckets.keys()].sort((a, b) => a - b)) {
    const scores = buckets.get(bucketStart)!;
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const label = `${bucketStart.toFixed(1)}-${(bucketStart + BUCKET_SIZE).toFixed(1)}`;
    console.log(
      `${label.padEnd(13)} ${String(scores.length).padEnd(3)} ${avg.toFixed(1).padEnd(6)} ${Math.min(...scores).toFixed(0).padEnd(6)} ${Math.max(...scores).toFixed(0)}`,
    );
  }

  console.log(
    '\nNote: right-censored below the current MATCH_PREFILTER_SIMILARITY_THRESHOLD - pairs that never passed the prefilter were never judged and are absent here.',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
