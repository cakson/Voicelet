import { afterEach, describe, expect, it } from 'vitest';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreGuildRepository } from '../../src/infrastructure/firestore/firestore-guild-repository.js';

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;
const guildId = '123456789012345678';
const configuration = {
  guildId,
  triggerChannelId: '223456789012345678',
  destinationCategoryId: '323456789012345678',
  inactivityTimeoutMinutes: 60,
  reconciliationIntervalMinutes: 15,
  permanentChannelIds: [],
  enabled: true,
  revision: 1,
};

suite('Firestore guild repository', () => {
  const firestore = new Firestore({ projectId: 'voicelet-test' });
  const repository = new FirestoreGuildRepository(firestore);
  afterEach(async () => {
    await firestore.recursiveDelete(firestore.collection('guildRegistrations'));
    await firestore.recursiveDelete(firestore.collection('guildConfigurations'));
  });
  it('persists registration, enabled state, and atomic deletion', async () => {
    await expect(repository.registerGuild(guildId)).resolves.toMatchObject({ kind: 'registered' });
    await expect(repository.createConfiguration(guildId, configuration)).resolves.toMatchObject({
      kind: 'saved',
    });
    await expect(repository.getEnabled(guildId)).resolves.toMatchObject({ kind: 'found' });
    await expect(repository.setConfigurationEnabled(guildId, false, 1)).resolves.toMatchObject({
      kind: 'disabled',
    });
    await expect(repository.getEnabled(guildId)).resolves.toEqual({ kind: 'not_found' });
    await expect(repository.deleteGuild(guildId)).resolves.toEqual({ kind: 'deleted' });
    await expect(repository.getGuild(guildId)).resolves.toEqual({ kind: 'not_found' });
  });
  it('keeps registrations isolated and permits clean re-registration after deletion', async () => {
    const otherGuildId = '123456789012345679';
    await expect(repository.registerGuild(guildId)).resolves.toMatchObject({ kind: 'registered' });
    await expect(repository.registerGuild(guildId)).resolves.toEqual({ kind: 'duplicate' });
    await expect(repository.registerGuild(otherGuildId)).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: null },
    });
    await repository.createConfiguration(guildId, configuration);
    await expect(repository.deleteGuild(guildId)).resolves.toEqual({ kind: 'deleted' });
    await expect(repository.getGuild(otherGuildId)).resolves.toMatchObject({
      kind: 'found',
      guild: { configuration: null },
    });
    await expect(repository.registerGuild(guildId)).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: null },
    });
  });
  it('requires registration, rejects invalid writes, and preserves disabled values across instances', async () => {
    const disabledConfiguration = { ...configuration, enabled: false };
    await expect(repository.createConfiguration(guildId, configuration)).resolves.toEqual({
      kind: 'not_found',
    });
    await expect(repository.registerGuild(guildId, disabledConfiguration)).resolves.toMatchObject({
      kind: 'registered',
      guild: { configuration: { enabled: false, revision: 1 } },
    });
    await expect(
      repository.replaceConfiguration(guildId, { ...configuration, triggerChannelId: 'bad' }, 1),
    ).resolves.toEqual({ kind: 'invalid' });
    const restartedRepository = new FirestoreGuildRepository(firestore);
    await expect(restartedRepository.getGuild(guildId)).resolves.toMatchObject({
      kind: 'found',
      guild: {
        configuration: {
          enabled: false,
          triggerChannelId: disabledConfiguration.triggerChannelId,
          revision: 1,
        },
      },
    });
  });
  it('atomically replaces configuration while retaining enabled state and rejects stale revisions', async () => {
    await repository.registerGuild(guildId, { ...configuration, enabled: false });
    const replacement = { ...configuration, triggerChannelId: '223456789012345679', enabled: true };
    await expect(repository.replaceConfiguration(guildId, replacement, 1)).resolves.toMatchObject({
      kind: 'saved',
      guild: {
        configuration: {
          enabled: false,
          triggerChannelId: replacement.triggerChannelId,
          revision: 2,
        },
      },
    });
    await expect(repository.setConfigurationEnabled(guildId, true, 1)).resolves.toMatchObject({
      kind: 'conflict',
      guild: { configuration: { enabled: false, revision: 2 } },
    });
    await expect(repository.setConfigurationEnabled(guildId, true, 2)).resolves.toMatchObject({
      kind: 'enabled',
      guild: {
        configuration: {
          enabled: true,
          triggerChannelId: replacement.triggerChannelId,
          revision: 3,
        },
      },
    });
  });
});
