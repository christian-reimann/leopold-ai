import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { searchQueries } from '@/db/schema/search-queries';
import type { SearchCriteria } from '@/shared/schemas/search-query';

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
}

export const searchQueryService = new SearchQueryService();
