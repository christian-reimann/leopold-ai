import { ApplicationWorker } from './application-worker';
import { DocumentWorker } from './document-worker';
import { JobSearchWorker } from './job-search-worker';

new DocumentWorker();
new JobSearchWorker();
new ApplicationWorker();

console.log(`[${new Date().toISOString()}] [worker] gestartet, warte auf Jobs …`);
