import type { Job } from 'bullmq';
import { parseDocumentById } from '@/core/documents/parse';
import { ParseDocumentJobSchema } from '@/shared/schemas/jobs';

export async function processParseDocument(job: Job): Promise<void> {
  const { documentId } = ParseDocumentJobSchema.parse(job.data);
  await parseDocumentById(documentId);
}
