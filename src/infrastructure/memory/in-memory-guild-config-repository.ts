import { isGuildId, parseGuildConfig, type GuildConfig } from '../../domain/guild-config.js';
import type {
  GuildConfigRepository,
  GuildConfigLookup,
  GuildConfigList,
  GuildConfigSave,
} from '../../ports/guild-config-repository.js';
import type { GuildConfigInput } from '../../domain/guild-config.js';
import type {
  EnabledConfigList,
  EnabledConfigLookup,
  EnabledGuildConfigRepository,
} from '../../ports/enabled-guild-config-repository.js';

export class InMemoryGuildConfigRepository
  implements GuildConfigRepository, EnabledGuildConfigRepository
{
  private readonly values = new Map<string, ReturnType<typeof parseGuildConfig>>();
  constructor(initial: Iterable<GuildConfigInput> = []) {
    for (const input of initial) {
      const config = parseGuildConfig(input) ?? legacyConfig(input);
      if (config) this.values.set(config.guildId, config);
    }
  }
  unavailable = false;
  invalidGuilds = new Set<string>();
  async get(guildId: string): Promise<GuildConfigLookup> {
    if (!isGuildId(guildId) && !this.values.has(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (this.invalidGuilds.has(guildId)) return { kind: 'invalid' };
    const config = this.values.get(guildId);
    return config ? { kind: 'found', config } : { kind: 'not_found' };
  }
  async list(): Promise<GuildConfigList> {
    if (this.unavailable) return { kind: 'unavailable' };
    return {
      kind: 'found',
      configs: [...this.values.values()].filter((v): v is NonNullable<typeof v> => !!v),
      invalidCount: this.invalidGuilds.size,
    };
  }
  async save(input: GuildConfigInput): Promise<GuildConfigSave> {
    if (this.unavailable) return { kind: 'unavailable' };
    const config = parseGuildConfig(input) ?? legacyConfig(input);
    if (!config) return { kind: 'invalid' };
    this.values.set(config.guildId, config);
    return { kind: 'saved', config };
  }
  async getEnabled(guildId: string): Promise<EnabledConfigLookup> {
    const result = await this.get(guildId);
    return result.kind === 'found' && result.config.enabled !== false
      ? result
      : result.kind === 'found'
        ? { kind: 'not_found' }
        : result;
  }
  async listEnabled(): Promise<EnabledConfigList> {
    const result = await this.list();
    return result.kind === 'found'
      ? { ...result, configs: result.configs.filter((config) => config.enabled !== false) }
      : result;
  }
}

function legacyConfig(input: GuildConfigInput): GuildConfig | undefined {
  if (
    typeof input.guildId !== 'string' ||
    !input.guildId.trim() ||
    typeof input.triggerChannelId !== 'string' ||
    !input.triggerChannelId.trim() ||
    typeof input.destinationCategoryId !== 'string' ||
    !input.destinationCategoryId.trim()
  )
    return undefined;
  return {
    guildId: input.guildId,
    triggerChannelId: input.triggerChannelId,
    destinationCategoryId: input.destinationCategoryId,
    inactivityTimeoutMinutes: input.inactivityTimeoutMinutes ?? 60,
    reconciliationIntervalMinutes: input.reconciliationIntervalMinutes ?? 15,
    permanentChannelIds: [...new Set(input.permanentChannelIds ?? [])],
    enabled: input.enabled ?? true,
    revision: input.revision ?? 1,
  };
}
