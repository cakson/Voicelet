import { parseGuildConfig, type GuildConfigInput } from '../../domain/guild-config.js';
import type {
  GuildConfigurationCreationRepository,
  GuildRegistrationRepository,
} from '../../ports/guild-administration-repository.js';
import { createFirestoreClient, disposeFirestoreClient } from './firestore-client-factory.js';
import { FirestoreGuildRepository } from './firestore-guild-repository.js';

export async function seedGuildConfig(
  repository: GuildRegistrationRepository & GuildConfigurationCreationRepository,
  input: GuildConfigInput,
): Promise<boolean> {
  const registration = await repository.registerGuild(input.guildId);
  if (registration.kind !== 'registered' && registration.kind !== 'duplicate') return false;
  const configuration = parseGuildConfig({ ...input, revision: 1 });
  if (!configuration) return false;
  const result = await repository.createConfiguration(input.guildId, configuration);
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
    const saved = await seedGuildConfig(new FirestoreGuildRepository(firestore), {
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
