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
});
