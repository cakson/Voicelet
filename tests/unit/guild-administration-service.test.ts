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
  it('lists registered guilds and supports explicitly disabled atomic initial configuration', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await expect(service.registerGuild({ guildId: 'invalid' })).resolves.toEqual({
      kind: 'invalid',
    });
    await expect(
      service.registerGuild({ guildId, configuration: { ...input, enabled: false } }),
    ).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: { enabled: false, revision: 1 } },
    });
    await expect(service.listRegisteredGuilds()).resolves.toMatchObject({
      kind: 'found',
      guilds: [{ guildId, configuration: { enabled: false } }],
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
  it('rejects stale or invalid edits without replacing valid persisted configuration', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await service.registerGuild({ guildId, configuration: input });
    const current = await service.getRegisteredGuild(guildId);
    if (current.kind !== 'found' || !current.guild.configuration)
      throw new Error('Expected config');
    await expect(
      service.replaceConfiguration(guildId, { ...input, triggerChannelId: '' }, 1),
    ).resolves.toEqual({ kind: 'invalid' });
    await expect(
      service.replaceConfiguration(
        guildId,
        { ...input, triggerChannelId: '223456789012345679' },
        2,
      ),
    ).resolves.toMatchObject({ kind: 'conflict' });
    await expect(service.getRegisteredGuild(guildId)).resolves.toMatchObject({
      kind: 'found',
      guild: { configuration: { triggerChannelId: input.triggerChannelId, revision: 1 } },
    });
  });
  it('keeps other guilds intact and permits clean re-registration after deletion', async () => {
    const otherGuildId = '123456789012345679';
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await service.registerGuild({ guildId, configuration: input });
    await service.registerGuild({ guildId: otherGuildId, configuration: input });
    await service.deleteGuild(guildId);
    await expect(service.getRegisteredGuild(otherGuildId)).resolves.toMatchObject({
      kind: 'found',
      guild: { configuration: { triggerChannelId: input.triggerChannelId } },
    });
    await expect(service.registerGuild({ guildId })).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: null },
    });
  });
  it('does not create a configuration for an unregistered guild or replace an existing one', async () => {
    const service = new GuildAdministrationService(new InMemoryGuildRepository());
    await expect(service.createConfiguration(guildId, input)).resolves.toEqual({
      kind: 'not_found',
    });
    await service.registerGuild({ guildId });
    await expect(service.createConfiguration(guildId, input)).resolves.toMatchObject({
      kind: 'saved',
    });
    await expect(service.createConfiguration(guildId, input)).resolves.toMatchObject({
      kind: 'conflict',
    });
  });
});
