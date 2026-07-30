import { desc, eq } from 'drizzle-orm';
import { jobSearchQueue } from '@/core/queue/job-search-queue';
import { db } from '@/db/client';
import { searchQueries } from '@/db/schema/search-queries';
import type { NotificationInterval, SearchCriteria } from '@/shared/schemas/search-query';

export class SearchQueryService {
  async getCriteria(searchQueryId: string): Promise<SearchCriteria> {
    const [row] = await db
      .select({ criteria: searchQueries.criteria })
      .from(searchQueries)
      .where(eq(searchQueries.id, searchQueryId));

    if (!row) {
      throw new Error(`Suchauftrag nicht gefunden: ${searchQueryId}`);
    }
    return row.criteria;
  }

  async listAll(): Promise<(typeof searchQueries.$inferSelect)[]> {
    return db.select().from(searchQueries).orderBy(desc(searchQueries.createdAt));
  }

  async create(input: { criteria: SearchCriteria; interval: NotificationInterval }): Promise<string> {
    const [row] = await db
      .insert(searchQueries)
      .values({ ...input, active: true })
      .returning({ id: searchQueries.id });
    if (!row) {
      throw new Error('Suchauftrag konnte nicht angelegt werden');
    }

    // upsertJobScheduler reiht den ersten Lauf sofort ein (delay=0) – kein zusätzliches
    // manuelles Einreihen nötig, siehe Kommentar in JobSearchQueue.scheduleSearchQuery.
    await jobSearchQueue.scheduleSearchQuery(row.id, input.interval);

    return row.id;
  }

  async update(
    searchQueryId: string,
    input: { criteria: SearchCriteria; interval: NotificationInterval },
  ): Promise<void> {
    const [row] = await db
      .update(searchQueries)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(searchQueries.id, searchQueryId))
      .returning({ active: searchQueries.active });
    if (!row) {
      throw new Error(`Suchauftrag nicht gefunden: ${searchQueryId}`);
    }

    if (row.active) {
      await jobSearchQueue.scheduleSearchQuery(searchQueryId, input.interval);
    }
  }

  async setActive(searchQueryId: string, active: boolean): Promise<void> {
    const [row] = await db
      .update(searchQueries)
      .set({ active, updatedAt: new Date() })
      .where(eq(searchQueries.id, searchQueryId))
      .returning({ interval: searchQueries.interval });
    if (!row) {
      return;
    }

    if (active) {
      await jobSearchQueue.scheduleSearchQuery(searchQueryId, row.interval);
    } else {
      await jobSearchQueue.unscheduleSearchQuery(searchQueryId);
    }
  }

  async delete(searchQueryId: string): Promise<void> {
    await jobSearchQueue.unscheduleSearchQuery(searchQueryId);
    await db.delete(searchQueries).where(eq(searchQueries.id, searchQueryId));
  }

  async runNow(searchQueryId: string): Promise<void> {
    await jobSearchQueue.enqueueRunSearchQuery(searchQueryId);
  }
}

export const searchQueryService = new SearchQueryService();
