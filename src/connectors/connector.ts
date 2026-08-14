import type { ConnectorResult } from '@/shared/schemas/connector-result';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export type { ConnectorResult } from '@/shared/schemas/connector-result';

/**
 * Unified interface implemented by every adapter – whether it's a public API
 * or a Playwright scraper
 */
export interface JobConnector {
  id: string;
  userAgent: string;
  search(criteria: SearchCriteria): Promise<ConnectorResult[]>;
}
