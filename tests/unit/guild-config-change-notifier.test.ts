import { describe, expect, it } from 'vitest';
import { TemporaryRoomReconciler } from '../../src/application/reconcile-temporary-rooms.js';
import { SimulatedDiscordClient } from '../../src/infrastructure/discord/simulated-client-factory.js';
import { InMemoryEnabledConfigRepository } from '../support/in-memory-enabled-config-repository.js';

describe('configuration lifecycle notifications', () => {
  it('cancels scheduled reconciliation when a configuration is disabled or deleted', async () => {
    let cancellations = 0;
    const scheduler = { schedule: () => ({ cancel: () => (cancellations += 1) }) };
    const reconciler = new TemporaryRoomReconciler(
      new InMemoryEnabledConfigRepository([
        { guildId: 'guild', triggerChannelId: 'trigger', destinationCategoryId: 'category' },
      ]),
      new SimulatedDiscordClient(),
      scheduler,
      () => false,
      () => undefined,
    );
    await reconciler.start();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await reconciler.configurationChanged('guild', 'disabled');
    await reconciler.configurationChanged('guild', 'deleted');
    expect(cancellations).toBe(1);
  });
});
