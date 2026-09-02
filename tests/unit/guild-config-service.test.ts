import { describe, expect, it } from 'vitest';
import { GuildConfigService } from '../../src/application/guild-config-service.js';
import { InMemoryGuildConfigRepository } from '../../src/infrastructure/memory/in-memory-guild-config-repository.js';

describe('GuildConfigService', () => {
  it('distinguishes configured and unconfigured guilds and replaces values', async () => {
    const service = new GuildConfigService(new InMemoryGuildConfigRepository());
    await expect(service.get('missing')).resolves.toEqual({ kind: 'not_found' });
    await expect(
      service.save({
        guildId: 'guild-a',
        triggerChannelId: 'trigger-a',
        destinationCategoryId: 'category-a',
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(
      service.save({
        guildId: 'guild-a',
        triggerChannelId: 'trigger-b',
        destinationCategoryId: 'category-b',
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(service.required('guild-a')).resolves.toMatchObject({
      triggerChannelId: 'trigger-b',
    });
  });

  it('returns safe outcomes for invalid and unavailable persistence', async () => {
    const repository = new InMemoryGuildConfigRepository();
    const service = new GuildConfigService(repository);
    await expect(
      service.save({ guildId: '', triggerChannelId: 't', destinationCategoryId: 'c' }),
    ).resolves.toEqual({ kind: 'invalid' });
    repository.unavailable = true;
    await expect(service.get('guild-a')).resolves.toEqual({ kind: 'unavailable' });
    await expect(service.required('guild-a')).resolves.toBeUndefined();
  });
});
