import { Queue } from 'bullmq';
import type { z } from 'zod';
import { redisConnection } from './connection';

/**
 * Generischer Wrapper um eine BullMQ-Queue: validiert Payloads gegen die pro Job-Name
 * hinterlegten Zod-Schemas, bevor sie eingereiht werden. `enqueue`/`upsertScheduler` sind
 * `protected` – konkrete Queues (siehe `document-queue.ts`/`job-search-queue.ts`) erweitern
 * diese Klasse und stellen darüber hinaus benannte `enqueueX`-Methoden für ihre jeweiligen
 * Jobs bereit, statt die generische API nach außen zu reichen.
 */
export abstract class JobQueue<TPayloadMap extends Record<string, z.ZodType>> {
  private readonly queue: Queue;

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

  protected async upsertScheduler<K extends keyof TPayloadMap & string>(
    schedulerId: string,
    repeat: { every: number },
    jobName: K,
    payload: z.infer<TPayloadMap[K]>,
  ): Promise<void> {
    const data = this.schemaFor(jobName).parse(payload);
    await this.queue.upsertJobScheduler(schedulerId, repeat, { name: jobName, data });
  }

  // `noUncheckedIndexedAccess` kennt bei generischem `K extends keyof TPayloadMap` nicht,
  // dass jeder gültige Key auch tatsächlich einen Wert hat – daher hier gebündelt einmal
  // nicht-null behauptet statt an jeder Aufrufstelle.
  private schemaFor<K extends keyof TPayloadMap & string>(jobName: K): TPayloadMap[K] {
    return this.schemas[jobName]!;
  }

  protected async removeScheduler(schedulerId: string): Promise<void> {
    await this.queue.removeJobScheduler(schedulerId);
  }
}
