import { jobPostingQueue } from '@/core/queue/jobposting-queue';
import { ApplicationWorker } from './application-worker';
import { DocumentWorker } from './document-worker';
import { JobPostingCleanupWorker } from './jobposting-cleanup-worker';
import { JobSearchWorker } from './job-search-worker';

new DocumentWorker();
new JobSearchWorker();
new ApplicationWorker();
new JobPostingCleanupWorker();

await jobPostingQueue.scheduleCleanup();

console.log(`[${new Date().toISOString()}] [worker] started, waiting for jobs …`);
