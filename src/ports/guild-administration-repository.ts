import type { GuildConfig } from '../domain/guild-config.js';

export type GuildAdministrationView = { guildId: string; configuration: GuildConfig | null };

export type GuildListResult =
  | { kind: 'found'; guilds: GuildAdministrationView[]; invalidCount: number }
  | { kind: 'unavailable' };
export type GuildLookupResult =
  | { kind: 'found'; guild: GuildAdministrationView }
  | { kind: 'not_found' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type GuildRegisterResult =
  | { kind: 'registered'; guild: GuildAdministrationView }
  | { kind: 'duplicate' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type ConfigSaveResult =
  | { kind: 'saved'; guild: GuildAdministrationView }
  | { kind: 'not_found' }
  | { kind: 'conflict'; guild: GuildAdministrationView }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type ConfigStateResult =
  | { kind: 'enabled' | 'disabled'; guild: GuildAdministrationView }
  | { kind: 'not_found' }
  | { kind: 'conflict'; guild: GuildAdministrationView }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };
export type GuildDeleteResult =
  { kind: 'deleted' } | { kind: 'not_found' } | { kind: 'invalid' } | { kind: 'unavailable' };

export interface GuildRegistrationRepository {
  listGuilds(): Promise<GuildListResult>;
  getGuild(guildId: string): Promise<GuildLookupResult>;
  registerGuild(guildId: string, initialConfiguration?: GuildConfig): Promise<GuildRegisterResult>;
}

export interface GuildConfigurationCreationRepository {
  createConfiguration(guildId: string, configuration: GuildConfig): Promise<ConfigSaveResult>;
}

export interface GuildConfigurationMutationRepository {
  replaceConfiguration(
    guildId: string,
    configuration: GuildConfig,
    expectedRevision: number,
  ): Promise<ConfigSaveResult>;
  setConfigurationEnabled(
    guildId: string,
    enabled: boolean,
    expectedRevision: number,
  ): Promise<ConfigStateResult>;
}

export interface GuildDeletionRepository {
  deleteGuild(guildId: string): Promise<GuildDeleteResult>;
}
