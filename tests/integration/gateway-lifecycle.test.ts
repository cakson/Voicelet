import { describe, expect, it } from 'vitest';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { SimulatedDiscordClientFactory } from '../support/gateway-simulator/index.js';
import {
  botTemporaryRoomJoin,
  temporaryRoomJoin,
  unconfiguredTemporaryRoomJoin,
} from '../support/fixtures/voice-state.js';
import { ManualScheduler } from '../support/manual-scheduler.js';

const configurations = new Map([
  [
    'test-guild',
    {
      triggerChannelId: 'trigger-channel',
      destinationCategoryId: 'category-id',
      inactivityTimeoutMinutes: 1,
    },
  ],
]);

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('DiscordGatewayEventSource', () => {
  it('translates simulated lifecycle events within the readiness bound', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const observability = Observability.create('silent');
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      observability,
    );
    await source.start();
    factory.client.emitReady();
    expect(source.readiness).toBe('ready');
    factory.client.emitDisconnect();
    expect(source.readiness).toBe('disconnected');
    factory.client.emitReconnect();
    expect(source.readiness).toBe('reconnecting');
    factory.client.emitError();
    expect(source.readiness).toBe('disconnected');
    expect(await observability.registry.metrics()).toContain('voicelet_gateway_failures_total 1');
    factory.client.emitReconnect();
    factory.client.emitReady();
    expect(source.readiness).toBe('ready');
  });

  it('creates, reuses, replaces, and safely retries simulated temporary rooms', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const observability = Observability.create('silent');
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      observability,
      configurations,
    );
    await source.start();
    factory.client.emitVoiceState(temporaryRoomJoin);
    await settled();
    expect(factory.client.rooms).toHaveLength(1);
    expect(factory.client.placements.get('test-guild:test-user')).toBe('sim-room-1');

    factory.client.emitVoiceState({ ...temporaryRoomJoin, previousChannelId: 'other-channel' });
    await settled();
    expect(factory.client.rooms).toHaveLength(1);

    factory.client.rooms.delete('sim-room-1');
    factory.client.emitVoiceState({ ...temporaryRoomJoin, previousChannelId: 'other-channel' });
    await settled();
    expect(factory.client.rooms).toHaveLength(1);
    expect(factory.client.placements.get('test-guild:test-user')).toBe('sim-room-2');

    factory.client.failNextMove = true;
    factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: 'move-failure' });
    await settled();
    factory.client.emitVoiceState({
      ...temporaryRoomJoin,
      userId: 'move-failure',
      previousChannelId: 'other-channel',
    });
    await settled();
    expect(factory.client.rooms).toHaveLength(2);
    expect(factory.client.placements.get('test-guild:move-failure')).toBe('sim-room-3');
    factory.client.failNextCreate = true;
    factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: 'create-failure' });
    await settled();
    expect(factory.client.rooms).toHaveLength(2);
    factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: 'recovered-user' });
    await settled();
    expect(factory.client.rooms).toHaveLength(3);
    expect(await observability.registry.metrics()).toContain(
      'voicelet_temporary_room_operations_total{outcome="move_failed"} 1',
    );
    expect(await observability.registry.metrics()).toContain(
      'voicelet_temporary_room_operations_total{outcome="create_failed"} 1',
    );
  });

  it('serializes duplicate events and keeps other configured users independent', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      Observability.create('silent'),
      configurations,
    );
    await source.start();
    for (let index = 0; index < 100; index += 1)
      factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: 'same-user' });
    for (let index = 0; index < 10; index += 1)
      factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: `user-${index}` });
    factory.client.emitVoiceState(botTemporaryRoomJoin);
    factory.client.emitVoiceState(unconfiguredTemporaryRoomJoin);
    await settled();
    expect(factory.client.rooms).toHaveLength(11);
    expect(factory.client.placements).toHaveLength(11);
  });

  it('deletes managed rooms after controlled continuous emptiness and preserves occupied rooms', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const observability = Observability.create('silent');
    const scheduler = new ManualScheduler();
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      scheduler,
      observability,
      configurations,
      scheduler,
    );
    await source.start();
    factory.client.emitVoiceState(temporaryRoomJoin);
    await settled();
    factory.client.emitVoiceState({
      ...temporaryRoomJoin,
      channelId: null,
      previousChannelId: 'sim-room-1',
    });
    await settled();
    await scheduler.advanceBy(59_000);
    expect(factory.client.rooms.has('sim-room-1')).toBe(true);

    factory.client.emitVoiceState({
      ...temporaryRoomJoin,
      userId: 'guest',
      channelId: 'sim-room-1',
      previousChannelId: null,
    });
    await settled();
    await scheduler.advanceBy(1_000);
    expect(factory.client.rooms.has('sim-room-1')).toBe(true);

    factory.client.emitVoiceState({
      ...temporaryRoomJoin,
      userId: 'guest',
      channelId: null,
      previousChannelId: 'sim-room-1',
    });
    await settled();
    await scheduler.advanceBy(60_000);
    expect(factory.client.rooms.has('sim-room-1')).toBe(false);
    expect(await observability.registry.metrics()).toContain(
      'voicelet_temporary_room_operations_total{outcome="deleted"} 1',
    );
    source.stop();
  });

  it('cleans an externally deleted room association and allows a replacement', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      Observability.create('silent'),
      configurations,
    );
    await source.start();
    factory.client.emitVoiceState(temporaryRoomJoin);
    await settled();
    factory.client.externalDelete('test-guild', 'sim-room-1');
    await settled();
    factory.client.emitVoiceState({ ...temporaryRoomJoin, previousChannelId: 'elsewhere' });
    await settled();
    expect(factory.client.rooms.has('sim-room-2')).toBe(true);
    source.stop();
  });

  it('leaves trigger and unrelated voice resources outside zombie cleanup', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const scheduler = new ManualScheduler();
    factory.client.rooms.set('unrelated-room', {
      guildId: 'test-guild',
      categoryId: 'other-category',
      name: 'unrelated',
    });
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      scheduler,
      Observability.create('silent'),
      configurations,
      scheduler,
    );
    await source.start();
    for (const previousChannelId of ['trigger-channel', 'unrelated-room']) {
      factory.client.emitVoiceState({ ...temporaryRoomJoin, channelId: null, previousChannelId });
    }
    await settled();
    await scheduler.advanceBy(60_000);
    expect(factory.client.deleteAttempts).toEqual([]);
    expect(factory.client.rooms.has('unrelated-room')).toBe(true);
    source.stop();
  });

  it('applies isolated owner allowances and restores moved rooms', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      Observability.create('silent'),
      configurations,
    );
    await source.start();
    factory.client.emitVoiceState(temporaryRoomJoin);
    await settled();
    factory.client.emitVoiceState({ ...temporaryRoomJoin, userId: 'second-user' });
    await settled();
    expect(factory.client.canManageRoom('sim-room-1', 'test-user')).toBe(true);
    expect(factory.client.canManageRoom('sim-room-1', 'second-user')).toBe(false);
    expect(factory.client.canManageRoom('sim-room-2', 'second-user')).toBe(true);
    factory.client.moveRoom('test-guild', 'sim-room-1', 'outside-category');
    await settled();
    expect(factory.client.rooms.get('sim-room-1')?.categoryId).toBe('category-id');
    source.stop();
  });

  it('reconciles startup zombies while preserving configured permanent and known managed rooms', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const scheduler = new ManualScheduler();
    const reconciliationConfig = new Map([
      [
        'test-guild',
        {
          triggerChannelId: 'trigger-channel',
          destinationCategoryId: 'category-id',
          inactivityTimeoutMinutes: 1,
          reconciliationIntervalMinutes: 1,
          permanentChannelIds: ['permanent-room'],
        },
      ],
    ]);
    factory.client.seedRoom('test-guild', 'empty-zombie', 'category-id');
    factory.client.seedRoom('test-guild', 'occupied-zombie', 'category-id');
    factory.client.seedRoom('test-guild', 'permanent-room', 'category-id');
    factory.client.seedRoom('test-guild', 'outside-room', 'other-category');
    factory.client.setRoomOccupied('test-guild', 'occupied-zombie', true);
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      scheduler,
      Observability.create('silent'),
      reconciliationConfig,
      scheduler,
    );
    await source.start();
    await settled();
    expect(factory.client.rooms.has('empty-zombie')).toBe(false);
    expect(factory.client.rooms.has('occupied-zombie')).toBe(true);
    expect(factory.client.rooms.has('permanent-room')).toBe(true);
    expect(factory.client.rooms.has('outside-room')).toBe(true);
    factory.client.setRoomOccupied('test-guild', 'occupied-zombie', false);
    await scheduler.advanceBy(60_000);
    expect(factory.client.rooms.has('occupied-zombie')).toBe(false);
    source.stop();
  });
});
