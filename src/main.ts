import { fileURLToPath } from 'node:url';
import { loadConfig, loadEnvironmentFile } from './config/load-config.js';
import { createWorker } from './composition/root.js';
import { SimulatedDiscordClientFactory } from './infrastructure/discord/simulated-client-factory.js';
import type { RawVoiceState } from './ports/index.js';

const gracefulShutdownTimeoutMs = 5_000;

export async function bootstrap(): Promise<void> {
  loadEnvironmentFile();
  const config = loadConfig();
  const worker = createWorker(config);
  await worker.server.listen(
    config.socketPath ? { path: config.socketPath } : { host: config.host, port: config.port },
  );
  await worker.source.start();
  const simulatedFactory =
    worker.factory instanceof SimulatedDiscordClientFactory ? worker.factory : undefined;
  if (config.gatewayMode === 'simulated' && simulatedFactory) {
    process.on('message', (message: unknown) => {
      if (typeof message !== 'object' || message === null || !('type' in message)) return;
      if (message.type === 'voice-state' && 'event' in message)
        simulatedFactory.client.emitVoiceState(message.event as RawVoiceState);
      if (message.type === 'fail-next-room-create') simulatedFactory.client.failNextCreate = true;
      if (message.type === 'fail-next-member-move') simulatedFactory.client.failNextMove = true;
      if (message.type === 'fail-next-room-delete') simulatedFactory.client.failNextDelete = true;
      if (message.type === 'fail-next-category-inspection')
        simulatedFactory.client.failNextCategoryInspection = true;
      if (message.type === 'fail-next-room-inspection')
        simulatedFactory.client.failNextRoomInspection = true;
      if (message.type === 'fail-next-owner-allowance')
        simulatedFactory.client.failNextOwnerAllowance = true;
      if (message.type === 'fail-next-category-restore')
        simulatedFactory.client.failNextCategoryRestore = true;
      if (
        message.type === 'seed-room' &&
        'guildId' in message &&
        'roomId' in message &&
        'categoryId' in message &&
        typeof message.guildId === 'string' &&
        typeof message.roomId === 'string' &&
        typeof message.categoryId === 'string'
      )
        simulatedFactory.client.seedRoom(message.guildId, message.roomId, message.categoryId);
      if (
        message.type === 'set-room-occupied' &&
        'guildId' in message &&
        'roomId' in message &&
        'occupied' in message &&
        typeof message.guildId === 'string' &&
        typeof message.roomId === 'string' &&
        typeof message.occupied === 'boolean'
      )
        simulatedFactory.client.setRoomOccupied(message.guildId, message.roomId, message.occupied);
      if (message.type === 'emit-ready') simulatedFactory.client.emitReady();
      if (
        message.type === 'move-room' &&
        'guildId' in message &&
        'roomId' in message &&
        typeof message.guildId === 'string' &&
        typeof message.roomId === 'string'
      )
        simulatedFactory.client.moveRoom(
          message.guildId,
          message.roomId,
          'categoryId' in message && typeof message.categoryId === 'string'
            ? message.categoryId
            : undefined,
        );
      if (
        message.type === 'advance-time' &&
        'milliseconds' in message &&
        typeof message.milliseconds === 'number' &&
        Number.isFinite(message.milliseconds) &&
        message.milliseconds >= 0
      )
        void worker.simulatedScheduler?.advanceBy(message.milliseconds);
      if (
        message.type === 'external-room-delete' &&
        'guildId' in message &&
        'roomId' in message &&
        typeof message.guildId === 'string' &&
        typeof message.roomId === 'string'
      )
        simulatedFactory.client.externalDelete(message.guildId, message.roomId);
    });
  }
  const shutdown = async () => {
    worker.source.stop();
    let timeout: NodeJS.Timeout;
    const timeoutReached = new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, gracefulShutdownTimeoutMs);
    });
    await Promise.race([worker.server.close(), timeoutReached]);
    clearTimeout(timeout!);
    if (process.connected) process.disconnect();
    process.exit(0);
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void bootstrap();
