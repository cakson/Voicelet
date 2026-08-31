import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

  it('starts a worker process and handles temporary rooms within required bounds', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'voicelet-e2e-'));
    const socketPath = join(directory, 'worker.sock');
    const worker = fork('src/main.ts', [], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GATEWAY_MODE: 'simulated',
        SOCKET_PATH: socketPath,
        LOG_LEVEL: 'silent',
        TEMPORARY_ROOM_CONFIG: JSON.stringify({
          'test-guild': {
            triggerChannelId: 'trigger-channel',
            destinationCategoryId: 'category-id',
            inactivityTimeoutMinutes: 1,
          },
        }),
      },
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    workers.push(worker);
    await waitFor(
      () => request(socketPath, '/readyz'),
      (response) => response.statusCode === 200,
      10_000,
    );
    const triggerEvent = {
      ...validVoiceState,
      channelId: 'trigger-channel',
      previousChannelId: null,
      isBot: false,
      displayName: 'Ada Lovelace',
    };
    worker.send({ type: 'voice-state', event: triggerEvent });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes('voicelet_voice_state_events_handled_total 1') &&
        response.body.includes('voicelet_temporary_room_operations_total{outcome="created"} 1'),
      1_000,
    );
    worker.send({
      type: 'voice-state',
      event: { ...triggerEvent, channelId: null, previousChannelId: 'sim-room-1' },
    });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="inactivity_started"} 1',
        ),
      1_000,
    );
    worker.send({ type: 'advance-time', milliseconds: 59_000 });
    worker.send({
      type: 'voice-state',
      event: { ...triggerEvent, userId: 'guest', channelId: 'sim-room-1', previousChannelId: null },
    });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="inactivity_cancelled"} 1',
        ),
      1_000,
    );
    worker.send({
      type: 'voice-state',
      event: { ...triggerEvent, userId: 'guest', channelId: null, previousChannelId: 'sim-room-1' },
    });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="inactivity_started"} 2',
        ),
      1_000,
    );
    worker.send({ type: 'advance-time', milliseconds: 60_000 });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes('voicelet_temporary_room_operations_total{outcome="deleted"} 1'),
      1_000,
    );
    worker.send({
      type: 'voice-state',
      event: { ...triggerEvent, previousChannelId: 'elsewhere' },
    });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes('voicelet_temporary_room_operations_total{outcome="created"} 2'),
      1_000,
    );
    worker.send({
      type: 'voice-state',
      event: { ...triggerEvent, channelId: null, previousChannelId: 'sim-room-2' },
    });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="inactivity_started"} 3',
        ),
      1_000,
    );
    worker.send({ type: 'fail-next-room-delete' });
    worker.send({ type: 'advance-time', milliseconds: 60_000 });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="delete_failed"} 1',
        ) &&
        response.body.includes(
          'voicelet_temporary_room_operations_total{outcome="retry_scheduled"} 1',
        ),
      1_000,
    );
    worker.send({ type: 'advance-time', milliseconds: 15 * 60_000 });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes('voicelet_temporary_room_operations_total{outcome="deleted"} 2'),
      1_000,
    );
    expect((await request(socketPath, '/readyz')).statusCode).toBe(200);
    const stopped = new Promise<void>((resolve) => worker.once('exit', () => resolve()));
    worker.kill('SIGTERM');
    await stopped;
    workers.splice(workers.indexOf(worker), 1);
    await rm(directory, { recursive: true, force: true });
  }, 40_000);

  it('reconciles pre-existing zombies after ready without real interval waits', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'voicelet-reconciliation-e2e-'));
    const socketPath = join(directory, 'worker.sock');
    const worker = fork('src/main.ts', [], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GATEWAY_MODE: 'simulated',
        SIMULATED_AUTO_READY: 'false',
        SOCKET_PATH: socketPath,
        LOG_LEVEL: 'silent',
        TEMPORARY_ROOM_CONFIG: JSON.stringify({
          'test-guild': {
            triggerChannelId: 'trigger-channel',
            destinationCategoryId: 'category-id',
            inactivityTimeoutMinutes: 1,
            reconciliationIntervalMinutes: 1,
            permanentChannelIds: ['permanent-room'],
          },
        }),
      },
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    workers.push(worker);
    await waitFor(
      () => request(socketPath, '/livez'),
      (response) => response.statusCode === 200,
      10_000,
    );
    for (const roomId of ['empty-zombie', 'occupied-zombie', 'permanent-room'])
      worker.send({ type: 'seed-room', guildId: 'test-guild', roomId, categoryId: 'category-id' });
    worker.send({
      type: 'set-room-occupied',
      guildId: 'test-guild',
      roomId: 'occupied-zombie',
      occupied: true,
    });
    worker.send({ type: 'emit-ready' });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_room_reconciliation_operations_total{outcome="zombie_deleted"} 1',
        ) &&
        response.body.includes(
          'voicelet_room_reconciliation_operations_total{outcome="zombie_occupied"} 1',
        ),
      2_000,
    );
    worker.send({
      type: 'set-room-occupied',
      guildId: 'test-guild',
      roomId: 'occupied-zombie',
      occupied: false,
    });
    worker.send({ type: 'advance-time', milliseconds: 60_000 });
    await waitFor(
      () => request(socketPath, '/metrics'),
      (response) =>
        response.body.includes(
          'voicelet_room_reconciliation_operations_total{outcome="zombie_deleted"} 2',
        ),
      2_000,
    );
    expect((await request(socketPath, '/readyz')).statusCode).toBe(200);
    worker.kill('SIGTERM');
    await rm(directory, { recursive: true, force: true });
  }, 20_000);
});
