import { parseGuildConfig } from '../../domain/guild-config.js';
import type {
  GuildConfigRepository,
  GuildConfigLookup,
  GuildConfigList,
  GuildConfigSave,
} from '../../ports/guild-config-repository.js';
import type { GuildConfigInput } from '../../domain/guild-config.js';
import type { TemporaryRoomConfig } from '../../domain/voice-state.js';

export class InMemoryGuildConfigRepository implements GuildConfigRepository {
  private readonly values = new Map<string, ReturnType<typeof parseGuildConfig>>();
  constructor(initial: Map<string, TemporaryRoomConfig> = new Map()) {
    for (const [guildId, value] of initial) {
      const input = { ...value, guildId };
      const config = parseGuildConfig(input);
      if (config) this.values.set(config.guildId, config);
    }
  }
  unavailable = false;
  invalidGuilds = new Set<string>();
  async get(guildId: string): Promise<GuildConfigLookup> {
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
    const config = parseGuildConfig(input);
    if (!config) return { kind: 'invalid' };
    this.values.set(config.guildId, config);
    return { kind: 'saved', config };
  }
}
