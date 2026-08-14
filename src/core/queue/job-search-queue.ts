import { RunSearchQueryJobSchema } from '@/shared/schemas/jobs';
import type { NotificationInterval } from '@/shared/schemas/search-query';
import { JobQueue } from './job-queue';

export const JOB_SEARCH_JOB_NAMES = {
  RUN_SEARCH_QUERY: 'run-search-query',
} as const;

const JOB_SEARCH_JOB_SCHEMAS = {
  [JOB_SEARCH_JOB_NAMES.RUN_SEARCH_QUERY]: RunSearchQueryJobSchema,
} as const;

/**
 * There is no push/webhook from the connector sources – "instant" here practically means
 * "polling hourly" instead of daily, not really instant. Deliberately not set to a shorter
 * interval, to avoid overloading the (partly unofficial) connector APIs.
 */
const INTERVAL_MS: Record<NotificationInterval, number> = {
  instant: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

function schedulerId(searchQueryId: string): string {
  return `search-query:${searchQueryId}`;
}

class JobSearchQueue extends JobQueue<typeof JOB_SEARCH_JOB_SCHEMAS> {
  constructor() {
    super('job-search', JOB_SEARCH_JOB_SCHEMAS);
  }

  async enqueueRunSearchQuery(searchQueryId: string): Promise<void> {
    await this.enqueue(JOB_SEARCH_JOB_NAMES.RUN_SEARCH_QUERY, { searchQueryId });
  }

  async runSearchQueryNow(searchQueryId: string): Promise<void> {
    await this.enqueueAndWait(JOB_SEARCH_JOB_NAMES.RUN_SEARCH_QUERY, { searchQueryId });
  }

  /**
   * Creates or updates a BullMQ job scheduler (same key = upsert). Verified live
   * (2026-07): the first run is enqueued immediately (delay=0), only subsequent
   * runs are offset by `every` – no additional manual enqueueing needed on creation.
   */
  async scheduleSearchQuery(searchQueryId: string, interval: NotificationInterval): Promise<void> {
    await this.upsertScheduler(
      schedulerId(searchQueryId),
      { every: INTERVAL_MS[interval] },
      JOB_SEARCH_JOB_NAMES.RUN_SEARCH_QUERY,
      { searchQueryId },
    );
  }

  async unscheduleSearchQuery(searchQueryId: string): Promise<void> {
    await this.removeScheduler(schedulerId(searchQueryId));
  }
}

export const jobSearchQueue = new JobSearchQueue();
