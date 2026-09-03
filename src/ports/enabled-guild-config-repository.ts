import type { GuildConfig } from '../domain/guild-config.js';

export type EnabledConfigLookup =
  | { kind: 'found'; config: GuildConfig }
  | { kind: 'not_found' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type EnabledConfigList =
  { kind: 'found'; configs: GuildConfig[]; invalidCount: number } | { kind: 'unavailable' };

export interface EnabledGuildConfigRepository {
  getEnabled(guildId: string): Promise<EnabledConfigLookup>;
  listEnabled(): Promise<EnabledConfigList>;
}
