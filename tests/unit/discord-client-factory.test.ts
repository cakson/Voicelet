import { describe, expect, it } from 'vitest';
import { ChannelType } from 'discord.js';
import { DiscordJsClient } from '../../src/infrastructure/discord/discord-client-factory.js';

describe('DiscordJsClient room lifecycle boundary', () => {
  it('does not treat an uncached guild as a missing room or successful deletion', async () => {
    const client = new DiscordJsClient({
      guilds: { cache: { get: () => undefined } },
    } as never);

    await expect(client.roomState('guild', 'room')).resolves.toBe('unavailable');
    await expect(client.deleteRoom('guild', 'room')).resolves.toBe('failed');
  });

  it('lists only category voice rooms and rechecks occupancy before cleanup deletion', async () => {
    const empty = {
      id: 'empty',
      type: ChannelType.GuildVoice,
      parentId: 'category',
      members: { size: 0 },
      delete: async () => undefined,
    };
    const occupied = {
      id: 'occupied',
      type: ChannelType.GuildVoice,
      parentId: 'category',
      members: { size: 1 },
      delete: async () => undefined,
    };
    const outside = { id: 'outside', type: ChannelType.GuildVoice, parentId: 'other' };
    const client = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: {
              fetch: async (id?: string) =>
                id
                  ? (new Map([
                      ['empty', empty],
                      ['occupied', occupied],
                    ]).get(id) ?? null)
                  : new Map([
                      ['empty', empty],
                      ['occupied', occupied],
                      ['outside', outside],
                    ]),
            },
          }),
        },
      },
    } as never);
    await expect(client.listCategoryVoiceRooms('guild', 'category')).resolves.toEqual([
      'empty',
      'occupied',
    ]);
    await expect(client.deleteEmptyRoom('guild', 'occupied')).resolves.toBe('occupied');
    await expect(client.deleteEmptyRoom('guild', 'empty')).resolves.toBe('deleted');
  });

  it('applies only the owner member overwrite and restores a voice room parent', async () => {
    const edits: unknown[] = [];
    let parentId: string | null = 'outside';
    const channel = {
      type: ChannelType.GuildVoice,
      guild: { id: 'guild' },
      parentId,
      permissionOverwrites: { edit: async (...args: unknown[]) => edits.push(args) },
      setParent: async (id: string) => {
        parentId = id;
      },
    };
    const client = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({ channels: { fetch: async () => ({ ...channel, parentId }) } }),
        },
      },
    } as never);
    await expect(client.applyOwnerAllowance('guild', 'room', 'owner')).resolves.toBe('applied');
    expect(edits).toEqual([['owner', { ManageChannels: true, ManageRoles: true }]]);
    await expect(client.restoreRoomCategory('guild', 'room', 'category')).resolves.toBe('restored');
    expect(parentId).toBe('category');
  });

  it('filters parent-change notifications to voice channels', () => {
    let update:
      | ((
          oldChannel: unknown,
          newChannel: {
            type: ChannelType;
            parentId: string | null;
            guild: { id: string };
            id: string;
          },
        ) => void)
      | undefined;
    const client = new DiscordJsClient({
      on: (event: string, listener: (oldChannel: unknown, newChannel: unknown) => void) => {
        if (event === 'channelUpdate') update = listener as typeof update;
      },
    } as never);
    const events: unknown[] = [];
    client.onRoomParentChanged((event) => events.push(event));
    update?.(
      { parentId: 'old' },
      { type: ChannelType.GuildVoice, parentId: 'new', guild: { id: 'guild' }, id: 'room' },
    );
    expect(events).toEqual([{ guildId: 'guild', roomId: 'room', parentId: 'new' }]);
  });

  it('contains missing rooms and provider permission failures', async () => {
    const missing = new DiscordJsClient({
      guilds: { cache: { get: () => ({ channels: { fetch: async () => null } }) } },
    } as never);
    await expect(missing.applyOwnerAllowance('guild', 'room', 'owner')).resolves.toBe('missing');
    const failing = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: {
              fetch: async () => ({
                type: ChannelType.GuildVoice,
                guild: { id: 'guild' },
                permissionOverwrites: {
                  edit: async () => {
                    throw new Error('provider');
                  },
                },
              }),
            },
          }),
        },
      },
    } as never);
    await expect(failing.applyOwnerAllowance('guild', 'room', 'owner')).resolves.toBe('failed');
  });
});
