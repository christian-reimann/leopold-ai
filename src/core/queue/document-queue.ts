import { Queue } from 'bullmq';
import { EmbedDocumentJobSchema, ExtractProfileJobSchema, ParseDocumentJobSchema } from '@/shared/schemas/jobs';
import { redisConnection } from './connection';

export const DOCUMENT_JOB_NAMES = {
  PARSE_DOCUMENT: 'parse-document',
  EXTRACT_PROFILE: 'extract-profile',
  EMBED_DOCUMENT: 'embed-document',
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

export async function enqueueEmbedDocument(documentId: string) {
  const payload = EmbedDocumentJobSchema.parse({ documentId });
  await documentQueue.add(DOCUMENT_JOB_NAMES.EMBED_DOCUMENT, payload);
}
