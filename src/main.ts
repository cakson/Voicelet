import { fileURLToPath } from 'node:url';
import { loadConfig } from './config/load-config.js';
import { createWorker } from './composition/root.js';

export async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const worker = createWorker(config);
  await worker.server.listen({ host: config.host, port: config.port });
  await worker.source.start();
  const shutdown = async () => {
    worker.source.stop();
    await worker.server.close();
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void bootstrap();
