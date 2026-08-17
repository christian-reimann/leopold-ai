import type { ConnectorResult, JobConnector, SourceIdLookup } from './connector';
import type { SearchCriteria } from '@/shared/schemas/search-query';

export interface ConnectorRunStats<T> {
  rawCount: number;
  mappedCount: number;
  droppedCount: number;
  // Capped sample of raw items that failed mapResult's schema validation – for
  // diagnosing API/site drift without holding onto the full raw payload.
  droppedSamples: T[];
}

const DROPPED_SAMPLES_LIMIT = 3;

export abstract class BaseConnector<T> implements JobConnector {
  abstract readonly id: string;
  abstract readonly userAgent: string;

  // Populated after each search() call – consumed by scripts/test-connectors.ts to
  // surface silently-dropped mapResult() failures instead of just the mapped count.
  lastRunStats: ConnectorRunStats<T> | undefined;

  protected abstract fetchRaw(criteria: SearchCriteria, sourceIdLookup?: SourceIdLookup): Promise<T[]>;
  protected abstract mapResult(raw: T): ConnectorResult | undefined;

  async search(criteria: SearchCriteria, sourceIdLookup?: SourceIdLookup): Promise<ConnectorResult[]> {
    const rawItems = await this.fetchRaw(criteria, sourceIdLookup);
    const results: ConnectorResult[] = [];
    const droppedSamples: T[] = [];
    for (const raw of rawItems) {
      const mapped = this.mapResult(raw);
      if (mapped) {
        results.push(mapped);
      } else if (droppedSamples.length < DROPPED_SAMPLES_LIMIT) {
        droppedSamples.push(raw);
      }
    }
    this.lastRunStats = {
      rawCount: rawItems.length,
      mappedCount: results.length,
      droppedCount: rawItems.length - results.length,
      droppedSamples,
    };
    return results;
  }
}
