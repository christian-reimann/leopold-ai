import type { JobPosting } from './job-posting';

export interface ConnectorResult {
  sourceId: string;
  posting: JobPosting;
  rawHtml?: string;
}
