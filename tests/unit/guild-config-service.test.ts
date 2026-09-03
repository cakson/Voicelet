import { describe, expect, it } from 'vitest';
import { GuildConfigService } from '../../src/application/guild-config-service.js';
import { InMemoryGuildConfigRepository } from '../../src/infrastructure/memory/in-memory-guild-config-repository.js';

describe('GuildConfigService', () => {
  it('distinguishes configured and unconfigured guilds and replaces values', async () => {
    const service = new GuildConfigService(new InMemoryGuildConfigRepository());
    await expect(service.get('123456789012345679')).resolves.toEqual({ kind: 'not_found' });
    await expect(
      service.save({
        guildId: '123456789012345678',
        triggerChannelId: '223456789012345678',
        destinationCategoryId: '323456789012345678',
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(
      service.save({
        guildId: '123456789012345678',
        triggerChannelId: '223456789012345679',
        destinationCategoryId: '323456789012345679',
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(service.required('123456789012345678')).resolves.toMatchObject({
      triggerChannelId: '223456789012345679',
    });
  });

  it('returns safe outcomes for invalid and unavailable persistence', async () => {
    const repository = new InMemoryGuildConfigRepository();
    const service = new GuildConfigService(repository);
    await expect(
      service.save({ guildId: '', triggerChannelId: 't', destinationCategoryId: 'c' }),
    ).resolves.toEqual({ kind: 'invalid' });
    repository.unavailable = true;
    await expect(service.get('123456789012345678')).resolves.toEqual({ kind: 'unavailable' });
    await expect(service.required('guild-a')).resolves.toBeUndefined();
  });

  it('rejects blank guild identifiers before reading persistence', async () => {
    let reads = 0;
    const service = new GuildConfigService({
      get: async () => {
        reads += 1;
        return { kind: 'not_found' } as const;
      },
      list: async () => ({ kind: 'found', configs: [], invalidCount: 0 }) as const,
      save: async () => ({ kind: 'invalid' }) as const,
    });
    await expect(service.get('   ')).resolves.toEqual({ kind: 'invalid' });
    expect(reads).toBe(0);
  });

  it('rejects blank submitted identifiers before writing persistence', async () => {
    let saves = 0;
    const service = new GuildConfigService({
      get: async () => ({ kind: 'not_found' }) as const,
      list: async () => ({ kind: 'found', configs: [], invalidCount: 0 }) as const,
      save: async () => {
        saves += 1;
        return { kind: 'invalid' } as const;
      },
    });
    await expect(
      service.save({
        guildId: '123456789012345678',
        triggerChannelId: ' ',
        destinationCategoryId: '323456789012345678',
      }),
    ).resolves.toEqual({ kind: 'invalid' });
    expect(saves).toBe(0);
  });
});
