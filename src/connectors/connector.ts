import type { ConnectorResult } from '@/shared/schemas/connector-result';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export type { ConnectorResult } from '@/shared/schemas/connector-result';

/**
 * Einheitliche Schnittstelle, die jeder Adapter implementiert – egal ob öffentliche API
 * oder Playwright-Scraper
 */
export interface JobConnector {
  id: string;
  userAgent: string;
  search(criteria: SearchCriteria): Promise<ConnectorResult[]>;
}
