import { ArbeitsagenturConnector } from './impl/arbeitsagentur-connector';
import { ConnectorRegistry } from './registry';

export const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new ArbeitsagenturConnector());
