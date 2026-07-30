import type { JobConnector } from './connector';

/**
 * Verwaltet die aktiven Connectors.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, JobConnector>();

  register(connector: JobConnector): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector mit id "${connector.id}" ist bereits registriert.`);
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
