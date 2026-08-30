import { afterEach, describe, expect, it } from 'vitest';
import { createWorker } from '../../src/composition/root.js';
import { SimulatedDiscordClientFactory } from '../support/gateway-simulator/index.js';
import { validVoiceState } from '../support/fixtures/voice-state.js';

describe('worker voice-state flow', () => {
  const workers: Array<ReturnType<typeof createWorker>> = [];
  afterEach(async () => {
    await Promise.all(
      workers.splice(0).map(async (worker) => {
        worker.source.stop();
        await worker.server.close();
      }),
    );
  });

  it('becomes ready and handles a simulated voice-state event within the required bounds', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const worker = createWorker(
      { gatewayMode: 'simulated', host: '127.0.0.1', port: 0, logLevel: 'silent' },
      factory,
    );
    workers.push(worker);
    await worker.source.start();
    factory.client.emitReady();
    expect((await worker.server.inject('/readyz')).statusCode).toBe(200);
    factory.client.emitVoiceState(validVoiceState);
    expect((await worker.server.inject('/metrics')).body).toContain(
      'voicelet_voice_state_events_handled_total 1',
    );
  });
});
