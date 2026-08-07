import type { Job } from 'bullmq';
import { connectorRegistry } from '@/connectors/registered-connectors';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { searchQueryService } from '@/core/jobs/search-query-service';
import { matchingService } from '@/core/matching/matching-service';
import { JOB_SEARCH_JOB_NAMES } from '@/core/queue/job-search-queue';
import { RunSearchQueryJobSchema } from '@/shared/schemas/jobs';
import { JobWorker } from './job-worker';

export class JobSearchWorker extends JobWorker<typeof JOB_SEARCH_JOB_NAMES> {
  constructor() {
    super('job-search', 'worker:job-search', {
      [JOB_SEARCH_JOB_NAMES.RUN_SEARCH_QUERY]: (job) => this.processRunSearchQuery(job),
    });
  }

  private async processRunSearchQuery(job: Job): Promise<void> {
    const { searchQueryId } = RunSearchQueryJobSchema.parse(job.data);
    const { criteria, profileId } = await searchQueryService.getCriteria(searchQueryId);

    const connectors = criteria.connectors
      ? connectorRegistry.getAll().filter((connector) => criteria.connectors?.includes(connector.id))
      : connectorRegistry.getAll();

    for (const connector of connectors) {
      const results = await connector.search(criteria);
      const newCanonicalIds = await jobPostingService.ingestConnectorResults(connector.id, results);
      for (const jobId of newCanonicalIds) {
        await matchingService.matchJob(jobId, profileId);
      }
    }
  }
}
