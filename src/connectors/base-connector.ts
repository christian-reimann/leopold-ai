import type { ConnectorResult, JobConnector } from './connector';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export abstract class BaseConnector<T> implements JobConnector {
  abstract readonly id: string;
  abstract readonly userAgent: string;

  protected abstract fetchRaw(criteria: SearchCriteria): Promise<T[]>;
  protected abstract mapResult(raw: T): ConnectorResult | undefined;

  async search(criteria: SearchCriteria): Promise<ConnectorResult[]> {
    const rawItems = await this.fetchRaw(criteria);
    const results: ConnectorResult[] = [];
    for (const raw of rawItems) {
      const mapped = this.mapResult(raw);
      if (mapped) {
        results.push(mapped);
      }
    }
    return results;
  }
}
