import { describe, expect, it } from 'vitest';
import { TemporaryRoomReconciler } from '../../src/application/reconcile-temporary-rooms.js';
import { SimulatedDiscordClient } from '../../src/infrastructure/discord/simulated-client-factory.js';
import { ManualScheduler } from '../support/manual-scheduler.js';

const config = new Map([
  [
    'guild',
    {
      triggerChannelId: 'trigger',
      destinationCategoryId: 'category',
      inactivityTimeoutMinutes: 1,
      reconciliationIntervalMinutes: 1,
      permanentChannelIds: ['permanent'],
    },
  ],
]);

async function settled(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('TemporaryRoomReconciler', () => {
  it('deletes only empty zombies and does not touch known or permanent rooms', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    discord.seedRoom('guild', 'zombie-empty', 'category');
    discord.seedRoom('guild', 'zombie-occupied', 'category');
    discord.seedRoom('guild', 'permanent', 'category');
    discord.seedRoom('guild', 'known', 'category');
    discord.seedRoom('guild', 'outside', 'other-category');
    discord.setRoomOccupied('guild', 'zombie-occupied', true);
    const reconciler = new TemporaryRoomReconciler(
      config,
      discord,
      scheduler,
      (_guildId, roomId) => roomId === 'known',
      (event) => observations.push(event),
    );

    reconciler.start();
    await settled();
    expect(discord.rooms.has('zombie-empty')).toBe(false);
    expect(discord.rooms.has('zombie-occupied')).toBe(true);
    expect(discord.rooms.has('permanent')).toBe(true);
    expect(discord.rooms.has('known')).toBe(true);
    expect(discord.rooms.has('outside')).toBe(true);
    expect(observations).toContain('reconciliation_zombie_deleted');
    expect(observations).toContain('reconciliation_zombie_occupied');
  });

  it('removes an occupied zombie on a later scheduled scan and contains failures', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    discord.seedRoom('guild', 'occupied', 'category');
    discord.seedRoom('guild', 'other-empty', 'category');
    discord.setRoomOccupied('guild', 'occupied', true);
    const reconciler = new TemporaryRoomReconciler(
      config,
      discord,
      scheduler,
      () => false,
      (event) => observations.push(event),
    );
    reconciler.start();
    await settled();
    expect(discord.rooms.has('occupied')).toBe(true);
    discord.setRoomOccupied('guild', 'occupied', false);
    await scheduler.advanceBy(60_000);
    expect(discord.rooms.has('occupied')).toBe(false);
    expect(discord.rooms.has('other-empty')).toBe(false);
    expect(observations).toContain('reconciliation_completed');
  });

  it('preserves unavailable candidates and continues to another candidate', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    discord.seedRoom('guild', 'unavailable', 'category');
    discord.seedRoom('guild', 'empty', 'category');
    discord.failNextRoomInspection = true;
    const reconciler = new TemporaryRoomReconciler(
      config,
      discord,
      scheduler,
      () => false,
      () => undefined,
    );
    reconciler.start();
    await settled();
    expect(discord.rooms.has('unavailable')).toBe(true);
    expect(discord.rooms.has('empty')).toBe(false);
  });

  it('coalesces duplicate requests and cancels future recurrence work on disposal', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    discord.seedRoom('guild', 'zombie', 'category');
    const reconciler = new TemporaryRoomReconciler(
      config,
      discord,
      scheduler,
      () => false,
      () => undefined,
    );
    reconciler.start();
    reconciler.start();
    await settled();
    expect(discord.deleteAttempts).toEqual([{ guildId: 'guild', roomId: 'zombie' }]);
    reconciler.dispose();
    discord.seedRoom('guild', 'later-zombie', 'category');
    await scheduler.advanceBy(60_000);
    expect(discord.rooms.has('later-zombie')).toBe(true);
  });

  it('contains a failed deletion and continues with another eligible zombie', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    discord.seedRoom('guild', 'failed', 'category');
    discord.seedRoom('guild', 'deleted', 'category');
    discord.failNextDelete = true;
    const reconciler = new TemporaryRoomReconciler(
      config,
      discord,
      scheduler,
      () => false,
      (event) => observations.push(event),
    );
    reconciler.start();
    await settled();
    expect(discord.rooms.has('failed')).toBe(true);
    expect(discord.rooms.has('deleted')).toBe(false);
    expect(observations).toContain('reconciliation_delete_failed');
  });
});
