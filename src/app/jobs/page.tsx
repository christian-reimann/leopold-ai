import { applicationService } from '@/core/applications/application-service';
import { matchingService, type MatchSortBy } from '@/core/matching/matching-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { JOBS_PAGE_SIZE } from './constants';
import { JobsList } from './jobs-list';

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const sortBy: MatchSortBy = sort === 'score' ? 'score' : 'postedAt';
  const profileId = await getActiveProfileId();
  const [rows, applicationIdsByJob, totalCount] = await Promise.all([
    matchingService.listRecent(profileId, JOBS_PAGE_SIZE, sortBy),
    applicationService.listIdsByJobForProfile(profileId),
    matchingService.countByProfile(profileId),
  ]);

  return (
    <JobsList
      key={`${profileId}-${sortBy}`}
      sortBy={sortBy}
      totalCount={totalCount}
      initialRows={rows.map((row) => ({
        id: row.id,
        jobId: row.jobId,
        score: row.score,
        reasoning: row.reasoning,
        data: row.data,
        sourceConnector: row.sourceConnector,
        applicationId: applicationIdsByJob.get(row.jobId),
      }))}
    />
  );
}
