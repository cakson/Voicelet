import type { GuildConfigInput } from '../../domain/guild-config.js';
import type { GuildConfigRepository } from '../../ports/guild-config-repository.js';
import { createFirestoreClient, disposeFirestoreClient } from './firestore-client-factory.js';
import { FirestoreGuildConfigRepository } from './firestore-guild-config-repository.js';

export async function seedGuildConfig(
  repository: GuildConfigRepository,
  input: GuildConfigInput,
): Promise<boolean> {
  const result = await repository.save(input);
  return result.kind === 'saved';
}

async function main(): Promise<void> {
  const [guildId, triggerChannelId, destinationCategoryId] = process.argv.slice(2);
  if (!guildId || !triggerChannelId || !destinationCategoryId)
    throw new Error(
      'Usage: pnpm guild-config:seed -- <guildId> <triggerChannelId> <destinationCategoryId>',
    );
  const firestore = createFirestoreClient(process.env.FIRESTORE_PROJECT_ID ?? 'voicelet-local');
  try {
    const saved = await seedGuildConfig(new FirestoreGuildConfigRepository(firestore), {
      guildId,
      triggerChannelId,
      destinationCategoryId,
    });
    if (!saved) throw new Error('Guild configuration was rejected by validation');
  } finally {
    await disposeFirestoreClient(firestore);
  }
}

if (process.argv[1]?.endsWith('seed-guild-config.ts')) void main();
