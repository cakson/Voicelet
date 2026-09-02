import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  emulatorFirestore,
  resetGuildConfigEmulator,
  seedGuildConfigEmulator,
} from '../support/firestore-emulator.js';

type Response = { statusCode: number; body: string };
function request(socketPath: string, path: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = get({ socketPath, path }, (response) => {
      let body = '';
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => resolve({ statusCode: response.statusCode ?? 0, body }));
    });
    request.on('error', reject);
  });
}
async function waitFor(
  action: () => Promise<Response>,
  predicate: (response: Response) => boolean,
): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await action();
      if (predicate(response)) return;
    } catch {
      /* worker is starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Condition was not met within 10000ms');
}

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
suite('worker persistent guild configuration', () => {
  const workers: ChildProcess[] = [];
  const firestore = emulatorFirestore();
  afterEach(async () => {
    workers.splice(0).forEach((worker) => worker.kill('SIGTERM'));
    await resetGuildConfigEmulator(firestore);
  });

  it('uses isolated configurations after a worker restart and skips unconfigured guilds', async () => {
    await seedGuildConfigEmulator(firestore, {
      guildId: 'guild-a',
      triggerChannelId: 'trigger-a',
      destinationCategoryId: 'category-a',
    });
    await seedGuildConfigEmulator(firestore, {
      guildId: 'guild-b',
      triggerChannelId: 'trigger-b',
      destinationCategoryId: 'category-b',
    });
    const directory = await mkdtemp(join(tmpdir(), 'voicelet-persistence-e2e-'));
    const start = (socketPath: string) =>
      fork('src/main.ts', [], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          GATEWAY_MODE: 'simulated',
          PERSISTENCE_PROVIDER: 'firestore',
          FIRESTORE_PROJECT_ID: 'voicelet-test',
          SOCKET_PATH: socketPath,
          LOG_LEVEL: 'silent',
        },
        execArgv: ['--import', 'tsx'],
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      });
    const send = (worker: ChildProcess, guildId: string, channelId: string) =>
      worker.send({
        type: 'voice-state',
        event: {
          guildId,
          userId: 'user',
          channelId,
          previousChannelId: null,
          sessionId: 'session',
          isBot: false,
          displayName: 'Test User',
        },
      });
    const firstSocket = join(directory, 'first.sock');
    const first = start(firstSocket);
    workers.push(first);
    await waitFor(
      () => request(firstSocket, '/readyz'),
      (response) => response.statusCode === 200,
    );
    send(first, 'guild-a', 'trigger-a');
    await waitFor(
      () => request(firstSocket, '/metrics'),
      (response) => response.body.includes('outcome="created"'),
    );
    send(first, 'unconfigured', 'trigger-a');
    await new Promise((resolve) => setTimeout(resolve, 100));
    first.kill('SIGTERM');
    const secondSocket = join(directory, 'second.sock');
    const second = start(secondSocket);
    workers.push(second);
    await waitFor(
      () => request(secondSocket, '/readyz'),
      (response) => response.statusCode === 200,
    );
    send(second, 'guild-b', 'trigger-b');
    await waitFor(
      () => request(secondSocket, '/metrics'),
      (response) => response.body.includes('outcome="created"'),
    );
    expect((await request(secondSocket, '/readyz')).statusCode).toBe(200);
    await rm(directory, { recursive: true, force: true });
  }, 30_000);
});
