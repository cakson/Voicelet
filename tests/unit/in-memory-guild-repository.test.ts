import { describe, expect, it } from 'vitest';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

const ids = {
  guild: '123456789012345678',
  orphan: '123456789012345679',
  trigger: '223456789012345678',
  category: '323456789012345678',
};

describe('InMemoryGuildRepository', () => {
  it('keeps registrations separate and returns only registered enabled configuration', async () => {
    const repository = new InMemoryGuildRepository({
      registrations: [ids.guild],
      configurations: [
        { guildId: ids.guild, triggerChannelId: ids.trigger, destinationCategoryId: ids.category },
      ],
      orphanConfigurations: [
        { guildId: ids.orphan, triggerChannelId: ids.trigger, destinationCategoryId: ids.category },
      ],
    });
    await expect(repository.listGuilds()).resolves.toMatchObject({
      kind: 'found',
      guilds: [{ guildId: ids.guild, configuration: { enabled: true } }],
    });
    await expect(repository.getEnabled(ids.guild)).resolves.toMatchObject({ kind: 'found' });
    await expect(repository.getEnabled(ids.orphan)).resolves.toEqual({ kind: 'not_found' });
    await expect(repository.listEnabled()).resolves.toMatchObject({
      kind: 'found',
      configs: [{ guildId: ids.guild }],
    });
  });

  it('filters disabled configuration and exposes deterministic fault controls', async () => {
    const repository = new InMemoryGuildRepository({ registrations: [ids.guild] });
    await repository.createConfiguration(ids.guild, {
      guildId: ids.guild,
      triggerChannelId: ids.trigger,
      destinationCategoryId: ids.category,
      inactivityTimeoutMinutes: 60,
      reconciliationIntervalMinutes: 15,
      permanentChannelIds: [],
      enabled: false,
      revision: 1,
    });
    await expect(repository.getEnabled(ids.guild)).resolves.toEqual({ kind: 'not_found' });
    repository.unavailable = true;
    await expect(repository.listGuilds()).resolves.toEqual({ kind: 'unavailable' });
    await expect(repository.listEnabled()).resolves.toEqual({ kind: 'unavailable' });
  });
});
