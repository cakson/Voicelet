import { afterEach, describe, expect, it } from 'vitest';
import { Firestore } from '@google-cloud/firestore';
import { FirestoreGuildConfigRepository } from '../../src/infrastructure/firestore/firestore-guild-config-repository.js';

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const suite = enabled ? describe : describe.skip;
const guildId = '100000000000000201';
const triggerA = '100000000000000202';
const categoryA = '100000000000000203';
const triggerB = '100000000000000204';
const categoryB = '100000000000000205';

suite('Firestore guild configuration repository', () => {
  const firestore = new Firestore({ projectId: 'voicelet-test' });
  const repository = new FirestoreGuildConfigRepository(firestore);
  afterEach(async () => {
    await firestore.recursiveDelete(firestore.collection('guildConfigurations'));
  });

  it('creates, reads, replaces, and distinguishes absent configurations', async () => {
    await expect(repository.get(guildId)).resolves.toEqual({ kind: 'not_found' });
    await expect(
      repository.save({
        guildId,
        triggerChannelId: triggerA,
        destinationCategoryId: categoryA,
      }),
    ).resolves.toMatchObject({ kind: 'saved' });
    await expect(repository.get(guildId)).resolves.toMatchObject({
      kind: 'found',
      config: { triggerChannelId: triggerA, destinationCategoryId: categoryA },
    });
    await repository.save({
      guildId,
      triggerChannelId: triggerB,
      destinationCategoryId: categoryB,
    });
    await expect(repository.get(guildId)).resolves.toMatchObject({
      kind: 'found',
      config: { triggerChannelId: triggerB, destinationCategoryId: categoryB },
    });
  });

  it('rejects malformed persisted documents without returning them', async () => {
    await firestore
      .collection('guildConfigurations')
      .doc(guildId)
      .set({ schemaVersion: 1, guildId });
    await expect(repository.get(guildId)).resolves.toEqual({ kind: 'invalid' });
  });

  it('lists valid records and aggregates invalid records without exposing documents', async () => {
    await repository.save({
      guildId,
      triggerChannelId: triggerA,
      destinationCategoryId: categoryA,
    });
    await firestore.collection('guildConfigurations').doc('broken').set({ schemaVersion: 99 });
    await expect(repository.list()).resolves.toMatchObject({
      kind: 'found',
      invalidCount: 1,
      configs: [{ guildId }],
    });
  });

  it('maps provider failures to unavailable', async () => {
    const failing = new FirestoreGuildConfigRepository({
      collection: () => {
        throw new Error('provider failure');
      },
    } as never);
    await expect(failing.get(guildId)).resolves.toEqual({ kind: 'unavailable' });
    await expect(failing.list()).resolves.toEqual({ kind: 'unavailable' });
    await expect(
      failing.save({
        guildId,
        triggerChannelId: triggerA,
        destinationCategoryId: categoryA,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('rejects invalid saves before writing a provider document', async () => {
    await expect(
      repository.save({
        guildId,
        triggerChannelId: '',
        destinationCategoryId: categoryA,
      }),
    ).resolves.toEqual({ kind: 'invalid' });
    await expect(
      firestore.collection('guildConfigurations').doc(guildId).get(),
    ).resolves.toMatchObject({ exists: false });
  });
});
