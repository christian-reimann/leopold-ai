import { CleanupStalePostingsJobSchema } from '@/shared/schemas/jobs';
import { JobQueue } from './job-queue';

export const JOB_POSTING_JOB_NAMES = {
  CLEANUP_STALE_POSTINGS: 'cleanup-stale-postings',
} as const;

const JOB_POSTING_JOB_SCHEMAS = {
  [JOB_POSTING_JOB_NAMES.CLEANUP_STALE_POSTINGS]: CleanupStalePostingsJobSchema,
} as const;

const CLEANUP_SCHEDULER_ID = 'job-postings-cleanup';
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

class JobPostingQueue extends JobQueue<typeof JOB_POSTING_JOB_SCHEMAS> {
  constructor() {
    super('job-postings', JOB_POSTING_JOB_SCHEMAS);
  }

  /**
   * Registers the single, fixed, always-on cleanup scheduler (idempotent upsert, same
   * schedulerId every time) - unlike JobSearchQueue.scheduleSearchQuery this is not tied to
   * any entity, needs no unschedule counterpart, and is wired once at worker boot.
   */
  async scheduleCleanup(): Promise<void> {
    await this.upsertScheduler(
      CLEANUP_SCHEDULER_ID,
      { every: CLEANUP_INTERVAL_MS },
      JOB_POSTING_JOB_NAMES.CLEANUP_STALE_POSTINGS,
      {},
    );
  }
}

export const jobPostingQueue = new JobPostingQueue();
