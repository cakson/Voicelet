import { afterEach, describe, expect, it } from 'vitest';
import {
  emulatorFirestore,
  resetGuildConfigEmulator,
  seedGuildConfigEmulator,
} from '../support/firestore-emulator.js';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { SimulatedDiscordClientFactory } from '../../src/infrastructure/discord/simulated-client-factory.js';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { FirestoreGuildConfigRepository } from '../../src/infrastructure/firestore/firestore-guild-config-repository.js';
import type { GuildConfigRepository } from '../../src/ports/guild-config-repository.js';

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

suite('Firestore emulator guild configuration setup', () => {
  const firestore = emulatorFirestore();
  afterEach(() => resetGuildConfigEmulator(firestore));

  it('seeds deterministic canonical configuration and resets it', async () => {
    await seedGuildConfigEmulator(firestore, {
      guildId: 'seed-guild',
      triggerChannelId: 'trigger',
      destinationCategoryId: 'category',
    });
    await expect(
      firestore.collection('guildConfigurations').doc('seed-guild').get(),
    ).resolves.toMatchObject({ exists: true });
    await resetGuildConfigEmulator(firestore);
    await expect(
      firestore.collection('guildConfigurations').doc('seed-guild').get(),
    ).resolves.toMatchObject({ exists: false });
  });

  it('keeps liveness healthy and restores readiness after a Firestore-backed read recovers', async () => {
    await seedGuildConfigEmulator(firestore, {
      guildId: 'health-guild',
      triggerChannelId: 'trigger',
      destinationCategoryId: 'category',
    });
    const delegate = new FirestoreGuildConfigRepository(firestore);
    let unavailable = false;
    const repository: GuildConfigRepository = {
      get: (guildId) =>
        unavailable ? Promise.resolve({ kind: 'unavailable' }) : delegate.get(guildId),
      list: () => delegate.list(),
      save: (input) => delegate.save(input),
    };
    const factory = new SimulatedDiscordClientFactory();
    const observability = Observability.create('silent');
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      observability,
      repository,
    );
    const server = createOperationalServer(
      () => ({ gateway: source.readiness, persistence: source.persistenceReady }),
      observability,
    );
    await source.start();
    unavailable = true;
    factory.client.emitVoiceState({
      guildId: 'health-guild',
      userId: 'user',
      channelId: 'trigger',
      previousChannelId: null,
      sessionId: 'session',
      isBot: false,
      displayName: 'User',
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect((await server.inject('/livez')).statusCode).toBe(200);
    expect((await server.inject('/readyz')).statusCode).toBe(503);
    unavailable = false;
    factory.client.emitVoiceState({
      guildId: 'health-guild',
      userId: 'recovered',
      channelId: 'trigger',
      previousChannelId: null,
      sessionId: 'session-2',
      isBot: false,
      displayName: 'Recovered',
    });
    await expect
      .poll(async () => (await server.inject('/readyz')).statusCode, {
        timeout: 5_000,
        interval: 50,
      })
      .toBe(200);
    source.stop();
    await server.close();
  });
});
