import {
  parseGuildConfig,
  type GuildConfig,
  type GuildConfigInput,
} from '../../domain/guild-config.js';
import { isDiscordSnowflake } from '../../domain/guild-registration.js';
import type {
  ConfigSaveResult,
  ConfigStateResult,
  GuildAdministrationView,
  GuildConfigurationCreationRepository,
  GuildConfigurationMutationRepository,
  GuildDeleteResult,
  GuildDeletionRepository,
  GuildListResult,
  GuildLookupResult,
  GuildRegisterResult,
  GuildRegistrationRepository,
} from '../../ports/guild-administration-repository.js';
import type {
  EnabledConfigList,
  EnabledConfigLookup,
  EnabledGuildConfigRepository,
} from '../../ports/enabled-guild-config-repository.js';

type InitialState = {
  registrations?: Iterable<string>;
  configurations?: Iterable<GuildConfigInput>;
  orphanConfigurations?: Iterable<GuildConfigInput>;
};

export class InMemoryGuildRepository
  implements
    GuildRegistrationRepository,
    GuildConfigurationCreationRepository,
    GuildConfigurationMutationRepository,
    GuildDeletionRepository,
    EnabledGuildConfigRepository
{
  private readonly registrations = new Set<string>();
  private readonly configurations = new Map<string, GuildConfig>();
  unavailable = false;
  readonly invalidGuilds = new Set<string>();

  constructor(initial: InitialState = {}) {
    for (const guildId of initial.registrations ?? [])
      if (isDiscordSnowflake(guildId)) this.registrations.add(guildId);
    for (const input of [
      ...(initial.configurations ?? []),
      ...(initial.orphanConfigurations ?? []),
    ]) {
      const config = parseGuildConfig(input);
      if (config) this.configurations.set(config.guildId, config);
    }
  }

  async listGuilds(): Promise<GuildListResult> {
    if (this.unavailable) return { kind: 'unavailable' };
    return {
      kind: 'found',
      guilds: [...this.registrations].sort().map((guildId) => this.view(guildId)),
      invalidCount: this.invalidGuilds.size,
    };
  }

  async getGuild(guildId: string): Promise<GuildLookupResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (this.invalidGuilds.has(guildId)) return { kind: 'invalid' };
    return this.registrations.has(guildId)
      ? { kind: 'found', guild: this.view(guildId) }
      : { kind: 'not_found' };
  }

  async registerGuild(
    guildId: string,
    initialConfiguration?: GuildConfig,
  ): Promise<GuildRegisterResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (this.registrations.has(guildId)) return { kind: 'duplicate' };
    const config = initialConfiguration ? parseGuildConfig(initialConfiguration) : undefined;
    if (initialConfiguration && (!config || config.guildId !== guildId)) return { kind: 'invalid' };
    this.registrations.add(guildId);
    if (config) this.configurations.set(guildId, config);
    return { kind: 'registered', guild: this.view(guildId) };
  }

  async createConfiguration(
    guildId: string,
    configuration: GuildConfig,
  ): Promise<ConfigSaveResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (!this.registrations.has(guildId)) return { kind: 'not_found' };
    if (this.configurations.has(guildId)) return { kind: 'conflict', guild: this.view(guildId) };
    const config = parseGuildConfig(configuration);
    if (!config || config.guildId !== guildId) return { kind: 'invalid' };
    this.configurations.set(guildId, { ...config, revision: 1 });
    return { kind: 'saved', guild: this.view(guildId) };
  }

  async replaceConfiguration(
    guildId: string,
    configuration: GuildConfig,
    expectedRevision: number,
  ): Promise<ConfigSaveResult> {
    if (!isDiscordSnowflake(guildId) || !Number.isInteger(expectedRevision) || expectedRevision < 1)
      return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (!this.registrations.has(guildId)) return { kind: 'not_found' };
    const current = this.configurations.get(guildId);
    if (!current) return { kind: 'not_found' };
    if (current.revision !== expectedRevision)
      return { kind: 'conflict', guild: this.view(guildId) };
    const parsed = parseGuildConfig({ ...configuration, guildId });
    if (!parsed) return { kind: 'invalid' };
    this.configurations.set(guildId, {
      ...parsed,
      enabled: current.enabled,
      revision: current.revision + 1,
    });
    return { kind: 'saved', guild: this.view(guildId) };
  }

  async setConfigurationEnabled(
    guildId: string,
    enabled: boolean,
    expectedRevision: number,
  ): Promise<ConfigStateResult> {
    if (
      !isDiscordSnowflake(guildId) ||
      typeof enabled !== 'boolean' ||
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 1
    )
      return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (!this.registrations.has(guildId)) return { kind: 'not_found' };
    const current = this.configurations.get(guildId);
    if (!current) return { kind: 'not_found' };
    if (current.revision !== expectedRevision)
      return { kind: 'conflict', guild: this.view(guildId) };
    this.configurations.set(guildId, { ...current, enabled, revision: current.revision + 1 });
    return { kind: enabled ? 'enabled' : 'disabled', guild: this.view(guildId) };
  }

  async deleteGuild(guildId: string): Promise<GuildDeleteResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (!this.registrations.has(guildId)) return { kind: 'not_found' };
    this.registrations.delete(guildId);
    this.configurations.delete(guildId);
    return { kind: 'deleted' };
  }

  async getEnabled(guildId: string): Promise<EnabledConfigLookup> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    if (this.unavailable) return { kind: 'unavailable' };
    if (this.invalidGuilds.has(guildId)) return { kind: 'invalid' };
    const config = this.registrations.has(guildId) ? this.configurations.get(guildId) : undefined;
    return config?.enabled ? { kind: 'found', config: this.copy(config) } : { kind: 'not_found' };
  }

  async listEnabled(): Promise<EnabledConfigList> {
    if (this.unavailable) return { kind: 'unavailable' };
    const configs = [...this.registrations]
      .map((guildId) => this.configurations.get(guildId))
      .filter((config): config is GuildConfig => Boolean(config?.enabled))
      .map((config) => this.copy(config));
    return { kind: 'found', configs, invalidCount: this.invalidGuilds.size };
  }

  private view(guildId: string): GuildAdministrationView {
    const configuration = this.configurations.get(guildId);
    return { guildId, configuration: configuration ? this.copy(configuration) : null };
  }

  private copy(configuration: GuildConfig): GuildConfig {
    return { ...configuration, permanentChannelIds: [...configuration.permanentChannelIds] };
  }
}
