'use server';

import { applicationService } from '@/core/applications/application-service';
import { matchingService, type MatchSortBy } from '@/core/matching/matching-service';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { JOBS_PAGE_SIZE } from './constants';
import type { JobRow } from './jobs-list';

export async function loadMoreJobsAction(offset: number, sortBy: MatchSortBy, maxAgeDays?: number): Promise<JobRow[]> {
  const profileId = await getActiveProfileId();
  const [rows, applicationIdsByJob] = await Promise.all([
    matchingService.listRecent(profileId, JOBS_PAGE_SIZE, sortBy, offset, maxAgeDays),
    applicationService.listIdsByJobForProfile(profileId),
  ]);

  return rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    score: row.score,
    reasoning: row.reasoning,
    data: row.data,
    sourceConnector: row.sourceConnector,
    applicationId: applicationIdsByJob.get(row.jobId),
  }));
}
