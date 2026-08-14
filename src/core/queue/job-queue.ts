import { Queue, QueueEvents } from 'bullmq';
import type { z } from 'zod';
import { redisConnection } from './connection';

/**
 * Generic wrapper around a BullMQ queue: validates payloads against the Zod schemas
 * registered per job name before enqueueing them. `enqueue`/`upsertScheduler` are
 * `protected` – concrete queues (see `document-queue.ts`/`job-search-queue.ts`) extend
 * this class and additionally provide named `enqueueX` methods for their respective
 * jobs, instead of exposing the generic API externally.
 */
export abstract class JobQueue<TPayloadMap extends Record<string, z.ZodType>> {
  private readonly queue: Queue;
  private queueEvents: QueueEvents | undefined;

  protected constructor(
    name: string,
    private readonly schemas: TPayloadMap,
  ) {
    this.queue = new Queue(name, { connection: redisConnection });
  }

  protected async enqueue<K extends keyof TPayloadMap & string>(
    jobName: K,
    payload: z.infer<TPayloadMap[K]>,
  ): Promise<void> {
    const data = this.schemaFor(jobName).parse(payload);
    await this.queue.add(jobName, data);
  }

  // Waits for the job to actually finish (e.g. so a UI spinner reflects the real
  // runtime instead of just the enqueueing), instead of returning immediately like `enqueue`.
  protected async enqueueAndWait<K extends keyof TPayloadMap & string>(
    jobName: K,
    payload: z.infer<TPayloadMap[K]>,
  ): Promise<void> {
    const data = this.schemaFor(jobName).parse(payload);
    const job = await this.queue.add(jobName, data);
    await job.waitUntilFinished(this.getQueueEvents());
  }

  private getQueueEvents(): QueueEvents {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents(this.queue.name, { connection: redisConnection });
    }
    return this.queueEvents;
  }

  protected async upsertScheduler<K extends keyof TPayloadMap & string>(
    schedulerId: string,
    repeat: { every: number },
    jobName: K,
    payload: z.infer<TPayloadMap[K]>,
  ): Promise<void> {
    const data = this.schemaFor(jobName).parse(payload);
    await this.queue.upsertJobScheduler(schedulerId, repeat, { name: jobName, data });
  }

  // With generic `K extends keyof TPayloadMap`, `noUncheckedIndexedAccess` doesn't know
  // that every valid key actually has a value – so it's asserted non-null here once,
  // bundled, instead of at every call site.
  private schemaFor<K extends keyof TPayloadMap & string>(jobName: K): TPayloadMap[K] {
    return this.schemas[jobName]!;
  }

  protected async removeScheduler(schedulerId: string): Promise<void> {
    await this.queue.removeJobScheduler(schedulerId);
  }
}
