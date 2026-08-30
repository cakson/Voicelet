import type { AppConfig } from '../config/load-config.js';
import { DiscordGatewayEventSource } from '../infrastructure/discord/discord-gateway-event-source.js';
import { DiscordJsClientFactory } from '../infrastructure/discord/discord-client-factory.js';
import { SimulatedDiscordClientFactory } from '../infrastructure/discord/simulated-client-factory.js';
import { createOperationalServer } from '../infrastructure/http/operational-server.js';
import { Observability } from '../infrastructure/logging/observability.js';
import type { Clock, DiscordClientFactory } from '../ports/index.js';

const systemClock: Clock = { now: () => new Date() };

export function createWorker(config: AppConfig, simulatedFactory?: DiscordClientFactory) {
  const observability = Observability.create(config.logLevel);
  const factory =
    config.gatewayMode === 'simulated'
      ? (simulatedFactory ?? new SimulatedDiscordClientFactory())
      : new DiscordJsClientFactory();
  const source = new DiscordGatewayEventSource(
    factory,
    config.discordToken ?? 'simulated-token',
    systemClock,
    observability,
  );
  const server = createOperationalServer(() => source.readiness, observability);
  return { source, server, observability, factory };
}
