import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { redisConnection } from '@/core/queue/connection';
import { jobPostingQueue } from '@/core/queue/jobposting-queue';
import { db } from '@/db/client';
import { jobPostings } from '@/db/schema/job-postings';
import { buildJobPosting } from '../fixtures/shared';
import { truncateAll } from '../fixtures/db/test-db';
import { JobPostingCleanupWorker } from '@/worker/jobposting-cleanup-worker';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe('JobPostingCleanupWorker (integration, real BullMQ + Redis)', () => {
  let worker: JobPostingCleanupWorker;

  beforeAll(() => {
    worker = new JobPostingCleanupWorker();
  });

  afterAll(async () => {
    await worker.close();
  });

  afterEach(async () => {
    await truncateAll();
  });

  it('removes a stale posting end to end via enqueue -> worker -> DB', async () => {
    const [posting] = await db
      .insert(jobPostings)
      .values({
        sourceConnector: 'adzuna',
        sourceId: randomUUID(),
        dedupeHash: randomUUID(),
        data: buildJobPosting({ postedAt: daysAgo(60).toISOString() }),
      })
      .returning({ id: jobPostings.id });
    const postingId = posting!.id;

    // scheduleCleanup relies on JobQueue's private queue instance, so enqueue the same
    // job name directly on a raw queue bound to the "job-postings" queue instead.
    const rawQueue = new Queue('job-postings', { connection: redisConnection });
    await rawQueue.add('cleanup-stale-postings', {});
    await rawQueue.close();

    await vi.waitFor(
      async () => {
        const [row] = await db.select().from(jobPostings).where(eq(jobPostings.id, postingId));
        expect(row).toBeUndefined();
      },
      { timeout: 10_000, interval: 100 },
    );
  });

  it('scheduleCleanup registers a fixed, always-on job scheduler', async () => {
    await jobPostingQueue.scheduleCleanup();

    const rawQueue = new Queue('job-postings', { connection: redisConnection });
    const schedulers = await rawQueue.getJobSchedulers();
    await rawQueue.close();

    expect(schedulers.some((scheduler) => scheduler.key === 'job-postings-cleanup')).toBe(true);
  });
});
