import { describe, expect, it } from 'vitest';
import {
  TemporaryRoomManager,
  temporaryRoomName,
} from '../../src/application/manage-temporary-room.js';
import { SimulatedDiscordClient } from '../../src/infrastructure/discord/simulated-client-factory.js';
import { ManualScheduler } from '../support/manual-scheduler.js';

const config = new Map([
  [
    'test-guild',
    { triggerChannelId: 'trigger', destinationCategoryId: 'category', inactivityTimeoutMinutes: 1 },
  ],
]);
const event = {
  guildId: 'test-guild',
  userId: 'user',
  channelId: 'trigger',
  previousChannelId: null,
  isBot: false,
  displayName: 'Ada Lovelace',
  receivedAt: new Date(),
};

describe('TemporaryRoomManager', () => {
  it('creates one named room and reuses it for duplicate events', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await Promise.all([manager.handle(event), manager.handle(event)]);
    expect(discord.rooms).toHaveLength(1);
    expect([...discord.rooms.values()][0]?.name).toBe('ada-lovelace-room');
    expect(discord.placements.get('test-guild:user')).toBe('sim-room-1');
    expect(discord.canManageRoom('sim-room-1', 'user')).toBe(true);
    expect(discord.canManageRoom('sim-room-1', 'other')).toBe(false);
  });
  it('contains owner allowance failures without retrying on reuse', async () => {
    const discord = new SimulatedDiscordClient();
    const observations: string[] = [];
    const manager = new TemporaryRoomManager(config, discord, (event) => observations.push(event));
    discord.failNextOwnerAllowance = true;
    await manager.handle(event);
    expect(discord.ownerAllowances.has('sim-room-1')).toBe(false);
    expect(observations).toContain('temporary_room_owner_permission_failed');
    await manager.handle(event);
    expect(discord.ownerAllowances.has('sim-room-1')).toBe(false);
    expect(discord.rooms).toHaveLength(1);
  });
  it('restores a moved room and reapplies its owner allowance', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle(event);
    discord.moveRoom('test-guild', 'sim-room-1', 'elsewhere');
    await manager.roomParentChanged({
      guildId: 'test-guild',
      roomId: 'sim-room-1',
      parentId: 'elsewhere',
    });
    expect(discord.rooms.get('sim-room-1')?.categoryId).toBe('category');
    expect(discord.canManageRoom('sim-room-1', 'user')).toBe(true);
  });
  it('retains the association when category restoration fails', async () => {
    const discord = new SimulatedDiscordClient();
    const observations: string[] = [];
    const manager = new TemporaryRoomManager(config, discord, (event) => observations.push(event));
    await manager.handle(event);
    discord.failNextCategoryRestore = true;
    await manager.roomParentChanged({
      guildId: 'test-guild',
      roomId: 'sim-room-1',
      parentId: 'elsewhere',
    });
    expect(manager.isKnownManagedRoom('test-guild', 'sim-room-1')).toBe(true);
    expect(observations).toContain('temporary_room_category_restore_failed');
  });
  it('coalesces duplicate parent-change notifications', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle(event);
    let applications = 0;
    const apply = discord.applyOwnerAllowance.bind(discord);
    discord.applyOwnerAllowance = async (...args) => {
      applications += 1;
      return apply(...args);
    };
    discord.moveRoom('test-guild', 'sim-room-1', 'elsewhere');
    await Promise.all([
      manager.roomParentChanged({
        guildId: 'test-guild',
        roomId: 'sim-room-1',
        parentId: 'elsewhere',
      }),
      manager.roomParentChanged({
        guildId: 'test-guild',
        roomId: 'sim-room-1',
        parentId: 'elsewhere',
      }),
    ]);
    expect(applications).toBe(1);
  });
  it('does not reapply an owner allowance after confirmed deletion races restoration', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle(event);
    let releaseRestore!: () => void;
    const restorationStarted = new Promise<void>((resolve) => {
      const restore = discord.restoreRoomCategory.bind(discord);
      discord.restoreRoomCategory = async (...args) => {
        resolve();
        await new Promise<void>((release) => {
          releaseRestore = release;
        });
        return restore(...args);
      };
    });
    let applications = 0;
    const apply = discord.applyOwnerAllowance.bind(discord);
    discord.applyOwnerAllowance = async (...args) => {
      applications += 1;
      return apply(...args);
    };

    const restoration = manager.roomParentChanged({
      guildId: 'test-guild',
      roomId: 'sim-room-1',
      parentId: 'elsewhere',
    });
    await restorationStarted;
    const deletion = manager.externalDeleted('test-guild', 'sim-room-1');
    releaseRestore();
    await Promise.all([restoration, deletion]);

    expect(applications).toBe(0);
    expect(manager.isKnownManagedRoom('test-guild', 'sim-room-1')).toBe(false);
  });
  it('ignores bots and replaces a missing stale room without a deletion callback', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle({ ...event, isBot: true });
    expect(discord.rooms).toHaveLength(0);
    await manager.handle(event);
    discord.rooms.delete('sim-room-1');
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms).toHaveLength(1);
    expect(discord.rooms.has('sim-room-2')).toBe(true);
    expect(discord.placements.get('test-guild:user')).toBe('sim-room-2');
  });
  it('ignores voice-state events outside the configured trigger', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle({ ...event, channelId: 'unrelated-channel' });
    await manager.handle({ ...event, previousChannelId: 'trigger' });
    expect(discord.rooms).toHaveLength(0);
  });
  it('retains rooms after movement failures and releases each member lock', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    discord.failNextMove = true;
    await manager.handle(event);
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms).toHaveLength(1);
    expect(discord.placements.get('test-guild:user')).toBe('sim-room-1');
  });
  it('creates one room for 100 overlapping deliveries while independent members proceed', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await Promise.all([
      ...Array.from({ length: 100 }, () => manager.handle(event)),
      ...Array.from({ length: 10 }, (_, index) =>
        manager.handle({ ...event, userId: `user-${index}` }),
      ),
    ]);
    expect(discord.rooms).toHaveLength(11);
    expect(discord.placements).toHaveLength(11);
  });
  it('uses a deterministic fallback name', () =>
    expect(temporaryRoomName('***')).toBe('temporary-room'));
  it('preserves the room suffix when enforcing the channel-name limit', () => {
    const name = temporaryRoomName('a'.repeat(200));
    expect(name).toHaveLength(100);
    expect(name.endsWith('-room')).toBe(true);
  });

  it('deletes only after one continuous empty period and then permits recreation', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    const manager = new TemporaryRoomManager(config, discord, scheduler, (event) =>
      observations.push(event),
    );
    await manager.handle(event);
    const roomId = 'sim-room-1';

    discord.placements.delete('test-guild:user');
    await manager.handle({ ...event, channelId: null, previousChannelId: roomId });
    await manager.handle({ ...event, channelId: null, previousChannelId: roomId });
    await scheduler.advanceBy(59_000);
    expect(discord.rooms.has(roomId)).toBe(true);

    discord.placements.set('test-guild:guest', roomId);
    await manager.handle({ ...event, userId: 'guest', channelId: roomId, previousChannelId: null });
    await scheduler.advanceBy(1_000);
    expect(discord.rooms.has(roomId)).toBe(true);

    discord.placements.delete('test-guild:guest');
    await manager.handle({ ...event, userId: 'guest', channelId: null, previousChannelId: roomId });
    await scheduler.advanceBy(59_999);
    expect(discord.rooms.has(roomId)).toBe(true);
    await scheduler.advanceBy(1);
    expect(discord.rooms.has(roomId)).toBe(false);
    expect(observations).toContain('temporary_room_inactivity_started');
    expect(observations).toContain('temporary_room_inactivity_cancelled');
    expect(observations).toContain('temporary_room_deleted');

    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms.has('sim-room-2')).toBe(true);
  });

  it('retries a failed deletion only after a fresh empty-state check', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    const manager = new TemporaryRoomManager(config, discord, scheduler, (event) =>
      observations.push(event),
    );
    await manager.handle(event);
    discord.placements.delete('test-guild:user');
    await manager.handle({ ...event, channelId: null, previousChannelId: 'sim-room-1' });
    discord.failNextDelete = true;
    await scheduler.advanceBy(60_000);
    expect(discord.rooms.has('sim-room-1')).toBe(true);
    expect(observations).toContain('temporary_room_delete_failed');
    expect(observations).toContain('temporary_room_retry_scheduled');

    discord.placements.set('test-guild:guest', 'sim-room-1');
    await scheduler.advanceBy(15 * 60_000);
    expect(discord.rooms.has('sim-room-1')).toBe(true);
  });

  it('tracks a newly created room left empty by an initial move failure', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const observations: string[] = [];
    const manager = new TemporaryRoomManager(config, discord, scheduler, (event) =>
      observations.push(event),
    );
    discord.failNextMove = true;
    await manager.handle(event);
    expect(discord.placements.has('test-guild:user')).toBe(false);
    expect(observations).toContain('temporary_room_inactivity_started');

    discord.failNextDelete = true;
    await scheduler.advanceBy(60_000);
    expect(discord.rooms.has('sim-room-1')).toBe(true);
    expect(observations).toContain('temporary_room_delete_failed');
    await scheduler.advanceBy(15 * 60_000);
    expect(discord.rooms.has('sim-room-1')).toBe(false);
  });

  it('clears externally deleted associations but keeps an association after a failed move', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const manager = new TemporaryRoomManager(config, discord, scheduler, () => undefined);
    await manager.handle(event);
    discord.externalDelete('test-guild', 'sim-room-1');
    await manager.externalDeleted('test-guild', 'sim-room-1');
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms.has('sim-room-2')).toBe(true);

    discord.failNextMove = true;
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms).toHaveLength(1);
  });

  it('does not replace an association when current room state is unavailable', async () => {
    const discord = new SimulatedDiscordClient();
    const scheduler = new ManualScheduler();
    const manager = new TemporaryRoomManager(config, discord, scheduler, () => undefined);
    await manager.handle(event);
    discord.roomState = async () => 'unavailable';
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms).toHaveLength(1);
  });
});
