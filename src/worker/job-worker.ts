import { type Job, Worker } from 'bullmq';
import { redisConnection } from '@/core/queue/connection';

type JobHandler = (job: Job) => Promise<void>;

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Generic wrapper around a BullMQ worker: dispatches incoming jobs based on `job.name`
 * to the handlers registered per job name and logs start/end/errors. Concrete workers
 * (see `document-worker.ts`/`job-search-worker.ts`) extend this class and pass their
 * handlers as private methods instead of exposing the dispatch logic externally.
 */
export abstract class JobWorker<TJobNames extends Record<string, string>> {
  private readonly worker: Worker;

  protected constructor(
    queueName: string,
    private readonly label: string,
    private readonly handlers: Record<TJobNames[keyof TJobNames], JobHandler>,
  ) {
    this.worker = new Worker(queueName, (job) => this.dispatch(job), { connection: redisConnection });
    this.attachLogging();
  }

  private async dispatch(job: Job): Promise<void> {
    const handler = this.handlers[job.name as TJobNames[keyof TJobNames]];
    if (!handler) {
      throw new Error(`Unknown job type: ${job.name}`);
    }
    await handler(job);
  }

  private attachLogging(): void {
    this.worker.on('active', (job) => {
      console.log(`[${timestamp()}] [${this.label}] ${job.name} (${job.id}) started`, job.data);
    });

    this.worker.on('completed', (job) => {
      const message = `[${timestamp()}] [${this.label}] ${job.name} (${job.id}) completed`;
      if (job.returnvalue === undefined) {
        console.log(message);
      } else {
        console.log(message, job.returnvalue);
      }
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[${timestamp()}] [${this.label}] ${job?.name} (${job?.id}) failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error(`[${timestamp()}] [${this.label}] Error:`, error.message);
    });
  }
}
