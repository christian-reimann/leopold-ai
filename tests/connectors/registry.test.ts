import { describe, expect, it } from 'vitest';
import type { JobConnector } from '@/connectors/connector';
import { ConnectorRegistry } from '@/connectors/registry';

function fakeConnector(id: string): JobConnector {
  return { id, userAgent: 'test-agent', search: async () => [] };
}

describe('ConnectorRegistry', () => {
  it('registers and returns connectors by id', () => {
    const registry = new ConnectorRegistry();
    const connector = fakeConnector('adzuna');
    registry.register(connector);
    expect(registry.getById('adzuna')).toBe(connector);
  });

  it('returns undefined for an unknown id', () => {
    const registry = new ConnectorRegistry();
    expect(registry.getById('unknown')).toBeUndefined();
  });

  it('getAll returns all registered connectors', () => {
    const registry = new ConnectorRegistry();
    registry.register(fakeConnector('adzuna'));
    registry.register(fakeConnector('arbeitnow'));
    expect(registry.getAll().map((c) => c.id).sort()).toEqual(['adzuna', 'arbeitnow']);
  });

  it('throws on duplicate registration', () => {
    const registry = new ConnectorRegistry();
    registry.register(fakeConnector('adzuna'));
    expect(() => registry.register(fakeConnector('adzuna'))).toThrow(/already registered/);
  });
});
