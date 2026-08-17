import type { ConnectorResult } from '@/shared/schemas/connector-result';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export type { ConnectorResult } from '@/shared/schemas/connector-result';

// Lets a connector skip the (expensive) per-item detail fetch for postings that are
// already known – injected by the caller so connectors stay DB-agnostic.
export type SourceIdLookup = (candidateSourceIds: string[]) => Promise<Set<string>>;

/**
 * Unified interface implemented by every adapter – whether it's a public API
 * or a Playwright scraper
 */
export interface JobConnector {
  id: string;
  userAgent: string;
  search(criteria: SearchCriteria, sourceIdLookup?: SourceIdLookup): Promise<ConnectorResult[]>;
}
