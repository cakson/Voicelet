import { describe, expect, it } from 'vitest';
import { ChannelType, GatewayIntentBits } from 'discord.js';
import {
  DiscordJsClient,
  requiredGatewayIntents,
} from '../../src/infrastructure/discord/discord-client-factory.js';
import {
  createFirestoreClient,
  disposeFirestoreClient,
} from '../../src/infrastructure/firestore/firestore-client-factory.js';

describe('DiscordJsClient room lifecycle boundary', () => {
  it('requests guild and voice-state Gateway intents for channel lifecycle events', () => {
    expect(requiredGatewayIntents).toEqual(
      expect.arrayContaining([GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]),
    );
  });

  it('does not treat an uncached guild as a missing room or successful deletion', async () => {
    const client = new DiscordJsClient({
      guilds: { cache: { get: () => undefined } },
    } as never);

    await expect(client.roomState('guild', 'room')).resolves.toBe('unavailable');
    await expect(client.deleteRoom('guild', 'room')).resolves.toBe('failed');
  });

  it('treats Discord unknown-channel responses as missing but retains transient failures', async () => {
    const unknownChannel = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: { fetch: async () => Promise.reject({ code: 10_003 }) },
          }),
        },
      },
    } as never);
    const unavailable = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: { fetch: async () => Promise.reject(new Error('network failure')) },
          }),
        },
      },
    } as never);

    await expect(unknownChannel.roomState('guild', 'room')).resolves.toBe('missing');
    await expect(unavailable.roomState('guild', 'room')).resolves.toBe('unavailable');
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

  it('classifies configured Discord resources by existence and channel type', async () => {
    const valid = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: {
              fetch: async (id: string) => ({
                id,
                guild: { id: 'guild' },
                type: id === 'trigger' ? ChannelType.GuildVoice : ChannelType.GuildCategory,
              }),
            },
          }),
        },
      },
    } as never);
    await expect(valid.inspectGuildConfigResources('guild', 'trigger', 'category')).resolves.toBe(
      'valid',
    );
    const wrong = new DiscordJsClient({
      guilds: {
        cache: {
          get: () => ({
            channels: {
              fetch: async () => ({ guild: { id: 'guild' }, type: ChannelType.GuildText }),
            },
          }),
        },
      },
    } as never);
    await expect(wrong.inspectGuildConfigResources('guild', 'trigger', 'category')).resolves.toBe(
      'wrong_type',
    );
    const missing = new DiscordJsClient({
      guilds: { cache: { get: () => ({ channels: { fetch: async () => null } }) } },
    } as never);
    await expect(missing.inspectGuildConfigResources('guild', 'trigger', 'category')).resolves.toBe(
      'missing',
    );
  });

  it('routes Firestore explicitly to the emulator and rejects malformed routing', async () => {
    const original = process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const client = createFirestoreClient('isolated-test');
    expect(
      (client as unknown as { _settings: { servicePath?: string; port?: number; ssl?: boolean } })
        ._settings,
    ).toMatchObject({ servicePath: '127.0.0.1', port: 8080, ssl: false });
    await disposeFirestoreClient(client);
    process.env.FIRESTORE_EMULATOR_HOST = 'not-a-port';
    expect(() => createFirestoreClient('isolated-test')).toThrow(
      'Invalid Firestore emulator configuration',
    );
    if (original === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = original;
  });
});
