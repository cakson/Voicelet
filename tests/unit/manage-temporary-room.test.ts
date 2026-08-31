import { describe, expect, it } from 'vitest';
import {
  TemporaryRoomManager,
  temporaryRoomName,
} from '../../src/application/manage-temporary-room.js';
import { SimulatedDiscordClient } from '../../src/infrastructure/discord/simulated-client-factory.js';

const config = new Map([
  ['test-guild', { triggerChannelId: 'trigger', destinationCategoryId: 'category' }],
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
  });
  it('ignores bots and replaces a stale room', async () => {
    const discord = new SimulatedDiscordClient();
    const manager = new TemporaryRoomManager(config, discord, () => undefined);
    await manager.handle({ ...event, isBot: true });
    expect(discord.rooms).toHaveLength(0);
    await manager.handle(event);
    discord.rooms.delete('sim-room-1');
    await manager.handle({ ...event, previousChannelId: 'elsewhere' });
    expect(discord.rooms).toHaveLength(1);
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
});
