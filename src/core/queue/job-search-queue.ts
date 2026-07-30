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
 * Es gibt keinen Push/Webhook von den Connector-Quellen – "instant" heißt hier praktisch
 * "stündlich pollen" statt täglich, nicht wirklich sofort. Bewusst nicht kürzer getaktet,
 * um die (teils inoffiziellen) Connector-APIs nicht zu überlasten.
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

  /**
   * Legt einen BullMQ Job Scheduler an oder aktualisiert ihn (gleicher Key = Upsert). Live
   * verifiziert (2026-07): der erste Lauf wird sofort (delay=0) eingereiht, erst die
   * darauffolgenden Läufe sind um `every` versetzt – kein zusätzliches manuelles Einreihen
   * beim Anlegen nötig.
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
