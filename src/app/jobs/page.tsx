import { applicationService } from '@/core/applications/application-service';
import { matchingService, type MatchSortBy } from '@/core/matching/matching-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { JOBS_PAGE_SIZE, parseMaxAgeDays, parseTitleQuery } from './constants';
import { JobsList } from './jobs-list';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; maxAge?: string; title?: string }>;
}) {
  const { sort, maxAge, title } = await searchParams;
  const sortBy: MatchSortBy = sort === 'postedAt' ? 'postedAt' : 'score';
  const maxAgeDays = parseMaxAgeDays(maxAge);
  const titleQuery = parseTitleQuery(title);
  const profileId = await getActiveProfileId();
  const [rows, applicationIdsByJob, totalCount] = await Promise.all([
    matchingService.listRecent(profileId, JOBS_PAGE_SIZE, sortBy, 0, maxAgeDays, titleQuery),
    applicationService.listIdsByJobForProfile(profileId),
    matchingService.countByProfile(profileId, maxAgeDays, titleQuery),
  ]);

  return (
    <JobsList
      key={`${profileId}-${sortBy}-${maxAgeDays ?? 'all'}`}
      sortBy={sortBy}
      maxAgeDays={maxAgeDays}
      titleQuery={titleQuery}
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
