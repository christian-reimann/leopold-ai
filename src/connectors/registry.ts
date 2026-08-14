import type { JobConnector } from './connector';

/**
 * Manages the active connectors.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, JobConnector>();

  register(connector: JobConnector): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector with id "${connector.id}" is already registered.`);
    }
    this.connectors.set(connector.id, connector);
  }

  getAll(): JobConnector[] {
    return [...this.connectors.values()];
  }

  getById(id: string): JobConnector | undefined {
    return this.connectors.get(id);
  }
}
