import { searchQueryService } from '@/core/jobs/search-query-service';
import { SearchQueryList } from './search-query-list';

export default async function SearchQueriesPage() {
  const queries = await searchQueryService.listAll();

  return (
    <SearchQueryList
      searchQueries={queries.map((query) => ({
        id: query.id,
        criteria: query.criteria,
        interval: query.interval,
        active: query.active,
      }))}
    />
  );
}
