import type { GuildConfigInput } from '../../domain/guild-config.js';
import type { GuildConfigRepository } from '../../ports/guild-config-repository.js';

export async function seedGuildConfig(
  repository: GuildConfigRepository,
  input: GuildConfigInput,
): Promise<boolean> {
  const result = await repository.save(input);
  return result.kind === 'saved';
}
