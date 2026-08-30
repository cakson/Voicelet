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
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'voice-state' &&
        'event' in message
      ) {
        simulatedFactory.client.emitVoiceState(message.event as RawVoiceState);
      }
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
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void bootstrap();
