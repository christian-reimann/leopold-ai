import { applicationService } from '@/core/applications/application-service';
import { matchingService, type MatchSortBy } from '@/core/matching/matching-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { JOBS_PAGE_SIZE, parseMaxAgeDays } from './constants';
import { JobsList } from './jobs-list';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; maxAge?: string }>;
}) {
  const { sort, maxAge } = await searchParams;
  const sortBy: MatchSortBy = sort === 'postedAt' ? 'postedAt' : 'score';
  const maxAgeDays = parseMaxAgeDays(maxAge);
  const profileId = await getActiveProfileId();
  const [rows, applicationIdsByJob, totalCount] = await Promise.all([
    matchingService.listRecent(profileId, JOBS_PAGE_SIZE, sortBy, 0, maxAgeDays),
    applicationService.listIdsByJobForProfile(profileId),
    matchingService.countByProfile(profileId, maxAgeDays),
  ]);

  return (
    <JobsList
      key={`${profileId}-${sortBy}-${maxAgeDays ?? 'all'}`}
      sortBy={sortBy}
      maxAgeDays={maxAgeDays}
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
