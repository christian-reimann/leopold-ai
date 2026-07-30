import type { Job } from 'bullmq';
import { connectorRegistry } from '@/connectors/registered-connectors';
import { jobPostingService } from '@/core/jobs/jobposting-service';
import { searchQueryService } from '@/core/jobs/search-query-service';
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
    const criteria = await searchQueryService.getCriteria(searchQueryId);

    for (const connector of connectorRegistry.getAll()) {
      const results = await connector.search(criteria);
      await jobPostingService.ingestConnectorResults(connector.id, results);
    }
  }
}
