import { jobPostingService } from '@/core/jobs/jobposting-service';
import { JOB_POSTING_JOB_NAMES } from '@/core/queue/jobposting-queue';
import { JobWorker } from './job-worker';

export class JobPostingCleanupWorker extends JobWorker<typeof JOB_POSTING_JOB_NAMES> {
  constructor() {
    super('job-postings', 'worker:jobposting-cleanup', {
      [JOB_POSTING_JOB_NAMES.CLEANUP_STALE_POSTINGS]: () => this.processCleanup(),
    });
  }

  private async processCleanup(): Promise<void> {
    const deleted = await jobPostingService.deleteStalePostings();
    console.log(`[worker:jobposting-cleanup] deleted ${deleted} stale job postings`);
  }
}
