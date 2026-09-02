import { afterEach, describe, expect, it } from 'vitest';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreGuildConfigRepository } from '../../src/infrastructure/firestore/firestore-guild-config-repository.js';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const suite = enabled ? describe : describe.skip;

suite('Firestore guild configuration repository', () => {
  const firestore = new Firestore({ projectId: 'voicelet-test' });
  const repository = new FirestoreGuildConfigRepository(firestore);
  afterEach(async () => {
    await firestore.recursiveDelete(firestore.collection('guildConfigurations'));
  });

  it('creates, reads, replaces, and distinguishes absent configurations', async () => {
    await expect(repository.get('guild-a')).resolves.toEqual({ kind: 'not_found' });
    await expect(
      repository.save({
        guildId: 'guild-a',
        triggerChannelId: 'trigger-a',
        destinationCategoryId: 'category-a',
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(repository.get('guild-a')).resolves.toMatchObject({
      kind: 'found',
      config: { triggerChannelId: 'trigger-a', destinationCategoryId: 'category-a' },
    });
    await repository.save({
      guildId: 'guild-a',
      triggerChannelId: 'trigger-b',
      destinationCategoryId: 'category-b',
    });
    await expect(repository.get('guild-a')).resolves.toMatchObject({
      kind: 'found',
      config: { triggerChannelId: 'trigger-b', destinationCategoryId: 'category-b' },
    });
  });

  it('rejects malformed persisted documents without returning them', async () => {
    await firestore
      .collection('guildConfigurations')
      .doc('guild-a')
      .set({ schemaVersion: 1, guildId: 'guild-a' });
    await expect(repository.get('guild-a')).resolves.toEqual({ kind: 'invalid' });
  });

  it('lists valid records and aggregates invalid records without exposing documents', async () => {
    await repository.save({
      guildId: 'guild-a',
      triggerChannelId: 'trigger',
      destinationCategoryId: 'category',
    });
    await firestore.collection('guildConfigurations').doc('broken').set({ schemaVersion: 99 });
    await expect(repository.list()).resolves.toMatchObject({
      kind: 'found',
      invalidCount: 1,
      configs: [{ guildId: 'guild-a' }],
    });
  });

  it('maps provider failures to unavailable', async () => {
    const failing = new FirestoreGuildConfigRepository({
      collection: () => {
        throw new Error('provider failure');
      },
    } as never);
    await expect(failing.get('guild-a')).resolves.toEqual({ kind: 'unavailable' });
    await expect(failing.list()).resolves.toEqual({ kind: 'unavailable' });
    await expect(
      failing.save({
        guildId: 'guild-a',
        triggerChannelId: 'trigger',
        destinationCategoryId: 'category',
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('rejects invalid saves before writing a provider document', async () => {
    await expect(
      repository.save({
        guildId: 'guild-a',
        triggerChannelId: '',
        destinationCategoryId: 'category',
      }),
    ).resolves.toEqual({ kind: 'invalid' });
    await expect(
      firestore.collection('guildConfigurations').doc('guild-a').get(),
    ).resolves.toMatchObject({ exists: false });
  });
});
