import { searchQueryService } from '@/core/jobs/search-query-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { SearchQueryList } from './search-query-list';

export default async function SearchQueriesPage() {
  const profileId = await getActiveProfileId();
  const queries = await searchQueryService.listAll(profileId);

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
