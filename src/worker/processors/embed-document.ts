import type { Job } from 'bullmq';
import { embedDocumentById } from '@/core/documents/embed';
import { EmbedDocumentJobSchema } from '@/shared/schemas/jobs';

export async function processEmbedDocument(job: Job): Promise<void> {
  const { documentId } = EmbedDocumentJobSchema.parse(job.data);
  await embedDocumentById(documentId);
}
