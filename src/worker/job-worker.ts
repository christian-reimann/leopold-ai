import { type Job, Worker } from 'bullmq';
import { redisConnection } from '@/core/queue/connection';

type JobHandler = (job: Job) => Promise<void>;

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Generischer Wrapper um einen BullMQ-Worker: dispatcht eingehende Jobs anhand von `job.name`
 * an die pro Job-Name hinterlegten Handler und protokolliert Start/Ende/Fehler. Konkrete Worker
 * (siehe `document-worker.ts`/`job-search-worker.ts`) erweitern diese Klasse und übergeben ihre
 * Handler als private Methoden statt die Dispatch-Logik nach außen zu reichen.
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
      throw new Error(`Unbekannter Job-Typ: ${job.name}`);
    }
    await handler(job);
  }

  private attachLogging(): void {
    this.worker.on('active', (job) => {
      console.log(`[${timestamp()}] [${this.label}] ${job.name} (${job.id}) gestartet`, job.data);
    });

    this.worker.on('completed', (job) => {
      const message = `[${timestamp()}] [${this.label}] ${job.name} (${job.id}) abgeschlossen`;
      if (job.returnvalue === undefined) {
        console.log(message);
      } else {
        console.log(message, job.returnvalue);
      }
    });

    this.worker.on('failed', (job, error) => {
      console.error(`[${timestamp()}] [${this.label}] ${job?.name} (${job?.id}) fehlgeschlagen:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error(`[${timestamp()}] [${this.label}] Fehler:`, error.message);
    });
  }
}
