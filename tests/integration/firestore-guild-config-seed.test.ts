import { afterEach, describe, expect, it } from 'vitest';
import {
  emulatorFirestore,
  resetGuildConfigEmulator,
  seedGuildConfigEmulator,
} from '../support/firestore-emulator.js';

const suite = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

suite('Firestore emulator guild configuration setup', () => {
  const firestore = emulatorFirestore();
  afterEach(() => resetGuildConfigEmulator(firestore));

  it('seeds deterministic canonical configuration and resets it', async () => {
    await seedGuildConfigEmulator(firestore, {
      guildId: 'seed-guild',
      triggerChannelId: 'trigger',
      destinationCategoryId: 'category',
    });
    await expect(
      firestore.collection('guildConfigurations').doc('seed-guild').get(),
    ).resolves.toMatchObject({ exists: true });
    await resetGuildConfigEmulator(firestore);
    await expect(
      firestore.collection('guildConfigurations').doc('seed-guild').get(),
    ).resolves.toMatchObject({ exists: false });
  });
});
