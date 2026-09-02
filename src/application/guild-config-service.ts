import {
  isGuildId,
  parseGuildConfig,
  type GuildConfig,
  type GuildConfigInput,
} from '../domain/guild-config.js';
import type {
  GuildConfigLookup,
  GuildConfigRepository,
  GuildConfigSave,
} from '../ports/guild-config-repository.js';

export class GuildConfigService {
  constructor(private readonly repository: GuildConfigRepository) {}
  get(guildId: string): Promise<GuildConfigLookup> {
    if (!isGuildId(guildId)) return Promise.resolve({ kind: 'invalid' });
    return this.repository.get(guildId);
  }
  list() {
    return this.repository.list();
  }
  save(input: GuildConfigInput): Promise<GuildConfigSave> {
    const config = parseGuildConfig(input);
    return config ? this.repository.save(config) : Promise.resolve({ kind: 'invalid' });
  }
  async required(guildId: string): Promise<GuildConfig | undefined> {
    const result = await this.get(guildId);
    return result.kind === 'found' ? result.config : undefined;
  }
}
