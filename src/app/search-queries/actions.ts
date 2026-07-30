'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { searchQueryService } from '@/core/jobs/search-query-service';
import { NotificationIntervalSchema, SearchCriteriaSchema } from '@/shared/schemas/search-query';

const CreateSearchQuerySchema = z.object({
  criteria: SearchCriteriaSchema,
  interval: NotificationIntervalSchema,
});

export async function createSearchQueryAction(input: unknown): Promise<void> {
  const { criteria, interval } = CreateSearchQuerySchema.parse(input);
  await searchQueryService.create({ criteria, interval });
  revalidatePath('/search-queries');
}

const SearchQueryIdSchema = z.uuid();

export async function updateSearchQueryAction(searchQueryId: string, input: unknown): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);
  const { criteria, interval } = CreateSearchQuerySchema.parse(input);
  await searchQueryService.update(id, { criteria, interval });
  revalidatePath('/search-queries');
}

export async function setSearchQueryActiveAction(searchQueryId: string, active: boolean): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);
  await searchQueryService.setActive(id, active);
  revalidatePath('/search-queries');
}

export async function deleteSearchQueryAction(searchQueryId: string): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);
  await searchQueryService.delete(id);
  revalidatePath('/search-queries');
}

export async function runSearchQueryNowAction(searchQueryId: string): Promise<void> {
  const id = SearchQueryIdSchema.parse(searchQueryId);
  await searchQueryService.runNow(id);
}
