import { describe, expect, it } from 'vitest';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { SimulatedDiscordClientFactory } from '../support/gateway-simulator/index.js';

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
  });
});
