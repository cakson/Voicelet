import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'vitest';
import { validVoiceState } from '../support/fixtures/voice-state.js';

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

async function waitFor<T>(
  action: () => Promise<T>,
  predicate: (value: T) => boolean,
  limit: number,
) {
  const deadline = Date.now() + limit;
  while (Date.now() < deadline) {
    try {
      const value = await action();
      if (predicate(value)) return value;
    } catch (error) {
      void error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Condition was not met within ${limit}ms`);
}

describe('worker voice-state flow', () => {
  const workers: ChildProcess[] = [];
  afterEach(() => {
    workers.splice(0).forEach((worker) => worker.kill('SIGTERM'));
  });

  it('starts a worker process and handles a simulated voice-state event within required bounds', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'voicelet-e2e-'));
    const socketPath = join(directory, 'worker.sock');
    const worker = fork('src/main.ts', [], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GATEWAY_MODE: 'simulated',
        SOCKET_PATH: socketPath,
        LOG_LEVEL: 'silent',
      },
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    workers.push(worker);
    await waitFor(
      () => request(socketPath, '/readyz'),
      (response) => response.statusCode === 200,
      30_000,
    );
    worker.send({ type: 'voice-state', event: validVoiceState });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) => response.body.includes('voicelet_voice_state_events_handled_total 1'),
      5_000,
    );
    const stopped = new Promise<void>((resolve) => worker.once('exit', () => resolve()));
    worker.kill('SIGTERM');
    await stopped;
    workers.splice(workers.indexOf(worker), 1);
    await rm(directory, { recursive: true, force: true });
  }, 40_000);
});
