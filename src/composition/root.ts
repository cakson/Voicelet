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
import { InMemoryGuildConfigRepository } from '../infrastructure/memory/in-memory-guild-config-repository.js';
import {
  createFirestoreClient,
  disposeFirestoreClient,
} from '../infrastructure/firestore/firestore-client-factory.js';
import { FirestoreGuildConfigRepository } from '../infrastructure/firestore/firestore-guild-config-repository.js';

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
  if (factory instanceof SimulatedDiscordClientFactory)
    factory.client.autoReady = config.simulatedAutoReady;
  const simulatedScheduler =
    config.gatewayMode === 'simulated' ? new SimulatedScheduler() : undefined;
  const firestore =
    config.persistenceProvider === 'firestore'
      ? createFirestoreClient(config.firestoreProjectId ?? 'voicelet')
      : undefined;
  const repository = firestore
    ? new FirestoreGuildConfigRepository(firestore)
    : new InMemoryGuildConfigRepository();
  const source = new DiscordGatewayEventSource(
    factory,
    config.discordToken ?? 'simulated-token',
    systemClock,
    observability,
    repository,
    simulatedScheduler ?? systemScheduler,
  );
  const server = createOperationalServer(
    () => ({ gateway: source.readiness, persistence: source.persistenceReady }),
    observability,
  );
  return {
    source,
    server,
    observability,
    factory,
    simulatedScheduler,
    repository,
    dispose: async () => {
      if (firestore) await disposeFirestoreClient(firestore);
    },
  };
}
