import { describe, expect, it } from 'vitest';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { SimulatedDiscordClientFactory } from '../support/gateway-simulator/index.js';

describe('DiscordGatewayEventSource', () => {
  it('translates simulated lifecycle events within the readiness bound', async () => {
    const factory = new SimulatedDiscordClientFactory();
    const source = new DiscordGatewayEventSource(
      factory,
      'test-token',
      { now: () => new Date() },
      Observability.create('silent'),
    );
    await source.start();
    factory.client.emitReady();
    expect(source.readiness).toBe('ready');
    factory.client.emitDisconnect();
    expect(source.readiness).toBe('disconnected');
    factory.client.emitReconnect();
    expect(source.readiness).toBe('reconnecting');
  });
});
