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
});
