import { describe, expect, it } from 'vitest';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { SimulatedDiscordClientFactory } from '../support/gateway-simulator/index.js';
import {
  botTemporaryRoomJoin,
  temporaryRoomJoin,
  unconfiguredTemporaryRoomJoin,
} from '../support/fixtures/voice-state.js';

const configurations = new Map([
  ['test-guild', { triggerChannelId: 'trigger-channel', destinationCategoryId: 'category-id' }],
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
});
