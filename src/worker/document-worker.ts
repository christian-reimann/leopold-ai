import type { Job } from 'bullmq';
import { documentService } from '@/core/documents/document-service';
import { DOCUMENT_JOB_NAMES } from '@/core/queue/document-queue';
import { EmbedDocumentJobSchema, ExtractProfileJobSchema, ParseDocumentJobSchema } from '@/shared/schemas/jobs';
import { JobWorker } from './job-worker';

export class DocumentWorker extends JobWorker<typeof DOCUMENT_JOB_NAMES> {
  constructor() {
    super('documents', 'worker:documents', {
      [DOCUMENT_JOB_NAMES.PARSE_DOCUMENT]: (job) => this.processParseDocument(job),
      [DOCUMENT_JOB_NAMES.EXTRACT_PROFILE]: (job) => this.processExtractProfile(job),
      [DOCUMENT_JOB_NAMES.EMBED_DOCUMENT]: (job) => this.processEmbedDocument(job),
    });
  }

  private async processParseDocument(job: Job): Promise<void> {
    const { documentId } = ParseDocumentJobSchema.parse(job.data);
    await documentService.parseDocumentById(documentId);
  }

  private async processExtractProfile(job: Job): Promise<void> {
    const { documentIds, profileId } = ExtractProfileJobSchema.parse(job.data);
    await documentService.extractProfileFromDocuments(documentIds, profileId);
  }

  private async processEmbedDocument(job: Job): Promise<void> {
    const { documentId } = EmbedDocumentJobSchema.parse(job.data);
    await documentService.embedDocumentById(documentId);
  }
}
