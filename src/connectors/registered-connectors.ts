import { ArbeitnowConnector } from './impl/arbeitnow-connector';
import { ArbeitsagenturConnector } from './impl/arbeitsagentur-connector';
import { GetInItConnector } from './impl/get-in-it-connector';
import { ConnectorRegistry } from './registry';

export const connectorRegistry = new ConnectorRegistry();
connectorRegistry.register(new ArbeitsagenturConnector());
connectorRegistry.register(new ArbeitnowConnector());
connectorRegistry.register(new GetInItConnector());
