import { describe, expect, it } from 'vitest';
import { GuildAdministrationService } from '../../src/application/guild-administration-service.js';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

const guildId = '123456789012345678';
const input = {
  triggerChannelId: '223456789012345678',
  destinationCategoryId: '323456789012345678',
};

describe('GuildAdministrationService', () => {
  it('registers unconfigured guilds, prevents duplicates, and creates configuration', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await expect(service.registerGuild({ guildId })).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: null },
    });
    await expect(service.registerGuild({ guildId })).resolves.toEqual({ kind: 'duplicate' });
    await expect(service.createConfiguration(guildId, input)).resolves.toMatchObject({
      kind: 'saved',
      guild: { configuration: { enabled: true } },
    });
  });
  it('preserves configuration values while disabling and re-enables with a new revision', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await service.registerGuild({ guildId, configuration: input });
    const current = await service.getRegisteredGuild(guildId);
    if (current.kind !== 'found' || !current.guild.configuration)
      throw new Error('Expected config');
    await expect(
      service.setConfigurationEnabled(guildId, false, current.guild.configuration.revision),
    ).resolves.toMatchObject({
      kind: 'disabled',
      guild: { configuration: { enabled: false, triggerChannelId: input.triggerChannelId } },
    });
  });
  it('deletes registration and its configuration cleanly', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await service.registerGuild({ guildId, configuration: input });
    await expect(service.deleteGuild(guildId)).resolves.toEqual({ kind: 'deleted' });
    await expect(service.getRegisteredGuild(guildId)).resolves.toEqual({ kind: 'not_found' });
  });
});
