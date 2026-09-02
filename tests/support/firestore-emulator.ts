import { Firestore } from '@google-cloud/firestore';
import type { GuildConfigInput } from '../../src/domain/guild-config.js';
import { FirestoreGuildConfigRepository } from '../../src/infrastructure/firestore/firestore-guild-config-repository.js';

export function emulatorFirestore(projectId = 'voicelet-test'): Firestore {
  return new Firestore({ projectId });
}

export async function resetGuildConfigEmulator(firestore: Firestore): Promise<void> {
  await firestore.recursiveDelete(firestore.collection('guildConfigurations'));
}

export async function seedGuildConfigEmulator(
  firestore: Firestore,
  input: GuildConfigInput,
): Promise<void> {
  const result = await new FirestoreGuildConfigRepository(firestore).save(input);
  if (result.kind !== 'saved')
    throw new Error(`Could not seed guild configuration: ${result.kind}`);
}
