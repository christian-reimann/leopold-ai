import { GenerateApplicationContentJobSchema } from '@/shared/schemas/jobs';
import { JobQueue } from './job-queue';

export const APPLICATION_JOB_NAMES = {
  GENERATE_CONTENT: 'generate-application-content',
} as const;

const APPLICATION_JOB_SCHEMAS = {
  [APPLICATION_JOB_NAMES.GENERATE_CONTENT]: GenerateApplicationContentJobSchema,
} as const;

class ApplicationQueue extends JobQueue<typeof APPLICATION_JOB_SCHEMAS> {
  constructor() {
    super('applications', APPLICATION_JOB_SCHEMAS);
  }

  async enqueueGenerateContent(applicationId: string, instructions?: string): Promise<void> {
    await this.enqueue(APPLICATION_JOB_NAMES.GENERATE_CONTENT, { applicationId, instructions });
  }
}

export const applicationQueue = new ApplicationQueue();
