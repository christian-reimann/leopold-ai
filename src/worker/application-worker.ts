import type { Job } from 'bullmq';
import { applicationService } from '@/core/applications/application-service';
import { APPLICATION_JOB_NAMES } from '@/core/queue/application-queue';
import { ExportApplicationPdfJobSchema, GenerateApplicationContentJobSchema } from '@/shared/schemas/jobs';
import { JobWorker } from './job-worker';

export class ApplicationWorker extends JobWorker<typeof APPLICATION_JOB_NAMES> {
  constructor() {
    super('applications', 'worker:applications', {
      [APPLICATION_JOB_NAMES.GENERATE_CONTENT]: (job) => this.processGenerateContent(job),
      [APPLICATION_JOB_NAMES.EXPORT_PDF]: (job) => this.processExportPdf(job),
    });
  }

  private async processGenerateContent(job: Job): Promise<void> {
    const { applicationId, instructions } = GenerateApplicationContentJobSchema.parse(job.data);
    await applicationService.generateContent(applicationId, instructions);
  }

  private async processExportPdf(job: Job): Promise<void> {
    const { applicationId } = ExportApplicationPdfJobSchema.parse(job.data);
    await applicationService.renderPdf(applicationId);
  }
}
