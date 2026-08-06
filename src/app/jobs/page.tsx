import { matchingService, type MatchSortBy } from '@/core/matching/matching-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { JobsList } from './jobs-list';

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const sortBy: MatchSortBy = sort === 'score' ? 'score' : 'postedAt';
  const profileId = await getActiveProfileId();
  const rows = await matchingService.listRecent(profileId, 50, sortBy);

  return (
    <JobsList
      sortBy={sortBy}
      rows={rows.map((row) => ({
        id: row.id,
        jobId: row.jobId,
        score: row.score,
        reasoning: row.reasoning,
        data: row.data,
        sourceConnector: row.sourceConnector,
      }))}
    />
  );
}
