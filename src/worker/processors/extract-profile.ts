import type { Job } from 'bullmq';
import { extractProfileFromDocuments } from '@/core/documents/extract-profile';
import { ExtractProfileJobSchema } from '@/shared/schemas/jobs';

export async function processExtractProfile(job: Job): Promise<void> {
  const { documentIds } = ExtractProfileJobSchema.parse(job.data);
  await extractProfileFromDocuments(documentIds);
}
