import type { GuildConfig, GuildConfigInput } from '../../src/domain/guild-config.js';
import type {
  EnabledConfigList,
  EnabledConfigLookup,
  EnabledGuildConfigRepository,
} from '../../src/ports/enabled-guild-config-repository.js';

export class InMemoryEnabledConfigRepository implements EnabledGuildConfigRepository {
  private readonly values = new Map<string, GuildConfig>();
  unavailable = false;
  constructor(initial: Iterable<GuildConfigInput> = []) {
    for (const input of initial) this.save(input);
  }
  async save(input: GuildConfigInput): Promise<void> {
    if (!input.guildId || !input.triggerChannelId || !input.destinationCategoryId) return;
    this.values.set(input.guildId, {
      guildId: input.guildId,
      triggerChannelId: input.triggerChannelId,
      destinationCategoryId: input.destinationCategoryId,
      inactivityTimeoutMinutes: input.inactivityTimeoutMinutes ?? 60,
      reconciliationIntervalMinutes: input.reconciliationIntervalMinutes ?? 15,
      permanentChannelIds: input.permanentChannelIds ?? [],
      enabled: input.enabled ?? true,
      revision: input.revision ?? 1,
    });
  }
  async getEnabled(guildId: string): Promise<EnabledConfigLookup> {
    if (this.unavailable) return { kind: 'unavailable' };
    const config = this.values.get(guildId);
    return config?.enabled ? { kind: 'found', config } : { kind: 'not_found' };
  }
  async listEnabled(): Promise<EnabledConfigList> {
    if (this.unavailable) return { kind: 'unavailable' };
    return {
      kind: 'found',
      configs: [...this.values.values()].filter((config) => config.enabled),
      invalidCount: 0,
    };
  }
}
