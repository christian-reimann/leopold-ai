import { DocumentWorker } from './document-worker';
import { JobSearchWorker } from './job-search-worker';

new DocumentWorker();
new JobSearchWorker();

console.log(`[${new Date().toISOString()}] [worker] gestartet, warte auf Jobs …`);
