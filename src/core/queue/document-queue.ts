import { EmbedDocumentJobSchema, ExtractProfileJobSchema, ParseDocumentJobSchema } from '@/shared/schemas/jobs';
import { JobQueue } from './job-queue';

export const DOCUMENT_JOB_NAMES = {
  PARSE_DOCUMENT: 'parse-document',
  EXTRACT_PROFILE: 'extract-profile',
  EMBED_DOCUMENT: 'embed-document',
} as const;

const DOCUMENT_JOB_SCHEMAS = {
  [DOCUMENT_JOB_NAMES.PARSE_DOCUMENT]: ParseDocumentJobSchema,
  [DOCUMENT_JOB_NAMES.EXTRACT_PROFILE]: ExtractProfileJobSchema,
  [DOCUMENT_JOB_NAMES.EMBED_DOCUMENT]: EmbedDocumentJobSchema,
} as const;

class DocumentQueue extends JobQueue<typeof DOCUMENT_JOB_SCHEMAS> {
  constructor() {
    super('documents', DOCUMENT_JOB_SCHEMAS);
  }

  async enqueueParseDocument(documentId: string): Promise<void> {
    await this.enqueue(DOCUMENT_JOB_NAMES.PARSE_DOCUMENT, { documentId });
  }

  async enqueueExtractProfile(documentIds: string[]): Promise<void> {
    await this.enqueue(DOCUMENT_JOB_NAMES.EXTRACT_PROFILE, { documentIds });
  }

  async enqueueEmbedDocument(documentId: string): Promise<void> {
    await this.enqueue(DOCUMENT_JOB_NAMES.EMBED_DOCUMENT, { documentId });
  }
}

export const documentQueue = new DocumentQueue();
