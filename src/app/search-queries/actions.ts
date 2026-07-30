'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { jobSearchQueue } from '@/core/queue/job-search-queue';
import { db } from '@/db/client';
import { searchQueries } from '@/db/schema/search-queries';
import { NotificationIntervalSchema, SearchCriteriaSchema } from '@/shared/schemas/search-query';

const CreateSearchQuerySchema = z.object({
  criteria: SearchCriteriaSchema,
  interval: NotificationIntervalSchema,
});

export async function createSearchQueryAction(input: unknown): Promise<void> {
  const { criteria, interval } = CreateSearchQuerySchema.parse(input);

  const [row] = await db.insert(searchQueries).values({ criteria, interval, active: true }).returning({
    id: searchQueries.id,
  });
  if (!row) {
    throw new Error('Suchauftrag konnte nicht angelegt werden');
  }

  // upsertJobScheduler reiht den ersten Lauf sofort ein (delay=0) – kein zusätzliches
  // manuelles Einreihen nötig, siehe Kommentar in JobSearchQueue.scheduleSearchQuery.
  await jobSearchQueue.scheduleSearchQuery(row.id, interval);

  revalidatePath('/search-queries');
}

const SearchQueryIdSchema = z.uuid();

export async function setSearchQueryActiveAction(searchQueryId: string, active: boolean): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);

  const [row] = await db
    .update(searchQueries)
    .set({ active, updatedAt: new Date() })
    .where(eq(searchQueries.id, id))
    .returning({ interval: searchQueries.interval });
  if (!row) {
    return;
  }

  if (active) {
    await jobSearchQueue.scheduleSearchQuery(id, row.interval);
  } else {
    await jobSearchQueue.unscheduleSearchQuery(id);
  }

  revalidatePath('/search-queries');
}

export async function deleteSearchQueryAction(searchQueryId: string): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);

  await jobSearchQueue.unscheduleSearchQuery(id);
  await db.delete(searchQueries).where(eq(searchQueries.id, id));

  revalidatePath('/search-queries');
}

export async function runSearchQueryNowAction(searchQueryId: string): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);
  await jobSearchQueue.enqueueRunSearchQuery(id);
}
