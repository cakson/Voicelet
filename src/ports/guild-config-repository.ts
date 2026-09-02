import type { GuildConfig, GuildConfigInput } from '../domain/guild-config.js';

export type GuildConfigLookup =
  | { kind: 'found'; config: GuildConfig }
  | { kind: 'not_found' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type GuildConfigSave =
  { kind: 'saved'; config: GuildConfig } | { kind: 'invalid' } | { kind: 'unavailable' };
export type GuildConfigList =
  { kind: 'found'; configs: GuildConfig[]; invalidCount: number } | { kind: 'unavailable' };

export interface GuildConfigRepository {
  get(guildId: string): Promise<GuildConfigLookup>;
  list(): Promise<GuildConfigList>;
  save(input: GuildConfigInput): Promise<GuildConfigSave>;
}
