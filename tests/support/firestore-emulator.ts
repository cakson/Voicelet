import { Firestore } from '@google-cloud/firestore';
import type { GuildConfigInput } from '../../src/domain/guild-config.js';
import { FirestoreGuildRepository } from '../../src/infrastructure/firestore/firestore-guild-repository.js';

export function emulatorFirestore(projectId = 'voicelet-test'): Firestore {
  return new Firestore({ projectId });
}

export async function resetGuildConfigEmulator(firestore: Firestore): Promise<void> {
  await Promise.all([
    firestore.recursiveDelete(firestore.collection('guildConfigurations')),
    firestore.recursiveDelete(firestore.collection('guildRegistrations')),
  ]);
}

export async function seedGuildConfigEmulator(
  firestore: Firestore,
  input: GuildConfigInput,
): Promise<void> {
  const repository = new FirestoreGuildRepository(firestore);
  const registration = await repository.registerGuild(input.guildId);
  if (registration.kind !== 'registered')
    throw new Error(`Could not seed guild registration: ${registration.kind}`);
  const result = await repository.createConfiguration(input.guildId, { ...input, revision: 1 });
  if (result.kind !== 'saved')
    throw new Error(`Could not seed guild configuration: ${result.kind}`);
}
