import { parseGuildConfig, type GuildConfigInput } from '../domain/guild-config.js';
import { isDiscordSnowflake } from '../domain/guild-registration.js';
import type {
  ConfigSaveResult,
  ConfigStateResult,
  GuildConfigurationCreationRepository,
  GuildConfigurationMutationRepository,
  GuildDeleteResult,
  GuildDeletionRepository,
  GuildListResult,
  GuildLookupResult,
  GuildRegisterResult,
  GuildRegistrationRepository,
} from '../ports/guild-administration-repository.js';
import type { GuildConfigChangeNotifier } from '../ports/guild-config-change-notifier.js';

type ConfigurationInput = Omit<GuildConfigInput, 'guildId' | 'revision'>;
type RegistrationInput = { guildId: string; configuration?: ConfigurationInput | null };

type AdministrationRepositories = GuildRegistrationRepository &
  GuildConfigurationCreationRepository &
  GuildConfigurationMutationRepository &
  GuildDeletionRepository;

const noopNotifier: GuildConfigChangeNotifier = { configurationChanged: async () => undefined };

export class GuildAdministrationService {
  constructor(
    private readonly repository: AdministrationRepositories,
    private readonly notifier: GuildConfigChangeNotifier = noopNotifier,
  ) {}

  listRegisteredGuilds(): Promise<GuildListResult> {
    return this.repository.listGuilds();
  }

  getRegisteredGuild(guildId: string): Promise<GuildLookupResult> {
    return isDiscordSnowflake(guildId)
      ? this.repository.getGuild(guildId)
      : Promise.resolve({ kind: 'invalid' });
  }

  async registerGuild(input: RegistrationInput): Promise<GuildRegisterResult> {
    if (!isDiscordSnowflake(input.guildId)) return { kind: 'invalid' };
    const configuration = input.configuration
      ? parseGuildConfig({ ...input.configuration, guildId: input.guildId, revision: 1 })
      : undefined;
    if (input.configuration && !configuration) return { kind: 'invalid' };
    const result = await this.repository.registerGuild(input.guildId, configuration);
    if (
      result.kind === 'registered' &&
      configuration &&
      !(await this.notify(input.guildId, 'configured'))
    )
      return { kind: 'unavailable' };
    return result;
  }

  async createConfiguration(guildId: string, input: ConfigurationInput): Promise<ConfigSaveResult> {
    const config = parseGuildConfig({ ...input, guildId, revision: 1 });
    if (!config) return { kind: 'invalid' };
    const result = await this.repository.createConfiguration(guildId, config);
    if (result.kind === 'saved' && !(await this.notify(guildId, 'configured')))
      return { kind: 'unavailable' };
    return result;
  }

  async replaceConfiguration(
    guildId: string,
    input: ConfigurationInput,
    expectedRevision: number,
  ): Promise<ConfigSaveResult> {
    const config = parseGuildConfig({ ...input, guildId, revision: expectedRevision });
    if (!config) return { kind: 'invalid' };
    const result = await this.repository.replaceConfiguration(guildId, config, expectedRevision);
    const changedInterval = result.kind === 'saved';
    if (changedInterval && !(await this.notify(guildId, 'interval_changed')))
      return { kind: 'unavailable' };
    return result;
  }

  async setConfigurationEnabled(
    guildId: string,
    enabled: boolean,
    expectedRevision: number,
  ): Promise<ConfigStateResult> {
    const result = await this.repository.setConfigurationEnabled(
      guildId,
      enabled,
      expectedRevision,
    );
    if (
      (result.kind === 'enabled' || result.kind === 'disabled') &&
      !(await this.notify(guildId, result.kind))
    )
      return { kind: 'unavailable' };
    return result;
  }

  async deleteGuild(guildId: string): Promise<GuildDeleteResult> {
    const result = await this.repository.deleteGuild(guildId);
    if (result.kind === 'deleted' && !(await this.notify(guildId, 'deleted')))
      return { kind: 'unavailable' };
    return result;
  }

  private async notify(
    guildId: string,
    change: Parameters<GuildConfigChangeNotifier['configurationChanged']>[1],
  ) {
    try {
      await this.notifier.configurationChanged(guildId, change);
      return true;
    } catch {
      return false;
    }
  }
}
