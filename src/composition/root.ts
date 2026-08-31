import type { AppConfig } from '../config/load-config.js';
import { DiscordGatewayEventSource } from '../infrastructure/discord/discord-gateway-event-source.js';
import { DiscordJsClientFactory } from '../infrastructure/discord/discord-client-factory.js';
import {
  SimulatedDiscordClientFactory,
  SimulatedScheduler,
} from '../infrastructure/discord/simulated-client-factory.js';
import { createOperationalServer } from '../infrastructure/http/operational-server.js';
import { Observability } from '../infrastructure/logging/observability.js';
import type { Clock, DiscordClientFactory, Scheduler } from '../ports/index.js';

const systemClock: Clock = { now: () => new Date() };
const systemScheduler: Scheduler = {
  schedule: (delayMs, callback) => {
    const timer = setTimeout(callback, delayMs);
    return { cancel: () => clearTimeout(timer) };
  },
};

export function createWorker(config: AppConfig, simulatedFactory?: DiscordClientFactory) {
  const observability = Observability.create(config.logLevel);
  const factory =
    config.gatewayMode === 'simulated'
      ? (simulatedFactory ?? new SimulatedDiscordClientFactory())
      : new DiscordJsClientFactory();
  const simulatedScheduler =
    config.gatewayMode === 'simulated' ? new SimulatedScheduler() : undefined;
  const source = new DiscordGatewayEventSource(
    factory,
    config.discordToken ?? 'simulated-token',
    systemClock,
    observability,
    config.temporaryRooms,
    simulatedScheduler ?? systemScheduler,
  );
  const server = createOperationalServer(() => source.readiness, observability);
  return { source, server, observability, factory, simulatedScheduler };
}
