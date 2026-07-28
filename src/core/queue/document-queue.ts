import { Queue } from 'bullmq';
import { ExtractProfileJobSchema, ParseDocumentJobSchema } from '@/shared/schemas/jobs';
import { redisConnection } from './connection';

export const DOCUMENT_JOB_NAMES = {
  PARSE_DOCUMENT: 'parse-document',
  EXTRACT_PROFILE: 'extract-profile',
} as const;

export const documentQueue = new Queue('documents', {
  connection: redisConnection,
});

export async function enqueueParseDocument(documentId: string) {
  const payload = ParseDocumentJobSchema.parse({ documentId });
  await documentQueue.add(DOCUMENT_JOB_NAMES.PARSE_DOCUMENT, payload);
}

export async function enqueueExtractProfile(documentIds: string[]) {
  const payload = ExtractProfileJobSchema.parse({ documentIds });
  await documentQueue.add(DOCUMENT_JOB_NAMES.EXTRACT_PROFILE, payload);
}
