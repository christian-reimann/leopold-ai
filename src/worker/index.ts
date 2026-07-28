import { type Job, Worker } from 'bullmq';
import { redisConnection } from '@/core/queue/connection';
import { DOCUMENT_JOB_NAMES } from '@/core/queue/document-queue';
import { processExtractProfile } from './processors/extract-profile';
import { processParseDocument } from './processors/parse-document';

async function processDocumentJob(job: Job): Promise<void> {
  switch (job.name) {
    case DOCUMENT_JOB_NAMES.PARSE_DOCUMENT:
      return processParseDocument(job);
    case DOCUMENT_JOB_NAMES.EXTRACT_PROFILE:
      return processExtractProfile(job);
    default:
      throw new Error(`Unbekannter Job-Typ: ${job.name}`);
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

const worker = new Worker('documents', processDocumentJob, {
  connection: redisConnection,
});

worker.on('active', (job) => {
  console.log(`[${timestamp()}] [worker] ${job.name} (${job.id}) gestartet`, job.data);
});

worker.on('completed', (job) => {
  const message = `[${timestamp()}] [worker] ${job.name} (${job.id}) abgeschlossen`;
  if (job.returnvalue === undefined) {
    console.log(message);
  } else {
    console.log(message, job.returnvalue);
  }
});

worker.on('failed', (job, error) => {
  console.error(`[${timestamp()}] [worker] ${job?.name} (${job?.id}) fehlgeschlagen:`, error.message);
});

worker.on('error', (error) => {
  console.error(`[${timestamp()}] [worker] Fehler:`, error.message);
});

console.log(`[${timestamp()}] [worker] gestartet, warte auf Jobs …`);
