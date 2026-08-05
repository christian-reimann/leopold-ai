import { ExportApplicationPdfJobSchema, GenerateApplicationContentJobSchema } from '@/shared/schemas/jobs';
import { JobQueue } from './job-queue';

export const APPLICATION_JOB_NAMES = {
  GENERATE_CONTENT: 'generate-application-content',
  EXPORT_PDF: 'export-application-pdf',
} as const;

const APPLICATION_JOB_SCHEMAS = {
  [APPLICATION_JOB_NAMES.GENERATE_CONTENT]: GenerateApplicationContentJobSchema,
  [APPLICATION_JOB_NAMES.EXPORT_PDF]: ExportApplicationPdfJobSchema,
} as const;

class ApplicationQueue extends JobQueue<typeof APPLICATION_JOB_SCHEMAS> {
  constructor() {
    super('applications', APPLICATION_JOB_SCHEMAS);
  }

  async enqueueGenerateContent(applicationId: string, instructions?: string): Promise<void> {
    await this.enqueue(APPLICATION_JOB_NAMES.GENERATE_CONTENT, { applicationId, instructions });
  }

  async enqueueExportPdf(applicationId: string): Promise<void> {
    await this.enqueue(APPLICATION_JOB_NAMES.EXPORT_PDF, { applicationId });
  }
}

export const applicationQueue = new ApplicationQueue();
