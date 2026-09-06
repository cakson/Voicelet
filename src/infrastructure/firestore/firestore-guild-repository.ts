import type { Firestore } from '@google-cloud/firestore';
import {
  parseGuildConfig,
  parseStoredGuildConfig,
  toStoredGuildConfig,
  type GuildConfig,
} from '../../domain/guild-config.js';
import {
  isDiscordSnowflake,
  parseStoredGuildRegistration,
  toStoredGuildRegistration,
} from '../../domain/guild-registration.js';
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

const registrationCollection = 'guildRegistrations';
const configurationCollection = 'guildConfigurations';

export class FirestoreGuildRepository
  implements
    GuildRegistrationRepository,
    GuildConfigurationCreationRepository,
    GuildConfigurationMutationRepository,
    GuildDeletionRepository,
    EnabledGuildConfigRepository
{
  constructor(private readonly firestore: Firestore) {}

  async listGuilds(): Promise<GuildListResult> {
    try {
      const [registrations, configurations] = await Promise.all([
        this.firestore.collection(registrationCollection).get(),
        this.firestore.collection(configurationCollection).get(),
      ]);
      const configs = new Map<string, GuildConfig>();
      let invalidCount = 0;
      for (const document of configurations.docs) {
        const config = parseStoredGuildConfig(document.data(), document.id);
        if (config) configs.set(document.id, config);
        else invalidCount += 1;
      }
      const guilds: GuildAdministrationView[] = [];
      for (const document of registrations.docs) {
        const registration = parseStoredGuildRegistration(document.data(), document.id);
        if (!registration) {
          invalidCount += 1;
          continue;
        }
        guilds.push({
          guildId: registration.guildId,
          configuration: configs.get(document.id) ?? null,
        });
      }
      return {
        kind: 'found',
        guilds: guilds.sort((left, right) => left.guildId.localeCompare(right.guildId)),
        invalidCount,
      };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async getGuild(guildId: string): Promise<GuildLookupResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    try {
      const registration = await this.firestore
        .collection(registrationCollection)
        .doc(guildId)
        .get();
      if (!registration.exists) return { kind: 'not_found' };
      if (!parseStoredGuildRegistration(registration.data(), guildId)) return { kind: 'invalid' };
      const configuration = await this.firestore
        .collection(configurationCollection)
        .doc(guildId)
        .get();
      if (!configuration.exists) return { kind: 'found', guild: { guildId, configuration: null } };
      const config = parseStoredGuildConfig(configuration.data(), guildId);
      if (!config) return { kind: 'invalid' };
      return { kind: 'found', guild: { guildId, configuration: config } };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async registerGuild(
    guildId: string,
    initialConfiguration?: GuildConfig,
  ): Promise<GuildRegisterResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    const config = initialConfiguration ? parseGuildConfig(initialConfiguration) : undefined;
    if (initialConfiguration && (!config || config.guildId !== guildId)) return { kind: 'invalid' };
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const registrationRef = this.firestore.collection(registrationCollection).doc(guildId);
        const configurationRef = this.firestore.collection(configurationCollection).doc(guildId);
        const existing = await transaction.get(registrationRef);
        if (existing.exists) return { kind: 'duplicate' };
        transaction.create(registrationRef, toStoredGuildRegistration({ guildId }));
        if (config)
          transaction.create(configurationRef, toStoredGuildConfig({ ...config, revision: 1 }));
        return {
          kind: 'registered',
          guild: { guildId, configuration: config ? { ...config, revision: 1 } : null },
        };
      });
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async createConfiguration(
    guildId: string,
    configuration: GuildConfig,
  ): Promise<ConfigSaveResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    const config = parseGuildConfig(configuration);
    if (!config || config.guildId !== guildId) return { kind: 'invalid' };
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const registrationRef = this.firestore.collection(registrationCollection).doc(guildId);
        const configurationRef = this.firestore.collection(configurationCollection).doc(guildId);
        const [registration, existing] = await Promise.all([
          transaction.get(registrationRef),
          transaction.get(configurationRef),
        ]);
        if (!registration.exists) return { kind: 'not_found' };
        if (!parseStoredGuildRegistration(registration.data(), guildId)) return { kind: 'invalid' };
        if (existing.exists) {
          const current = parseStoredGuildConfig(existing.data(), guildId);
          return current
            ? { kind: 'conflict', guild: { guildId, configuration: current } }
            : { kind: 'invalid' };
        }
        const saved = { ...config, revision: 1 };
        transaction.create(configurationRef, toStoredGuildConfig(saved));
        return { kind: 'saved', guild: { guildId, configuration: saved } };
      });
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async replaceConfiguration(
    guildId: string,
    configuration: GuildConfig,
    expectedRevision: number,
  ): Promise<ConfigSaveResult> {
    if (!isDiscordSnowflake(guildId) || !Number.isInteger(expectedRevision) || expectedRevision < 1)
      return { kind: 'invalid' };
    const parsed = parseGuildConfig({ ...configuration, guildId });
    if (!parsed) return { kind: 'invalid' };
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const registrationRef = this.firestore.collection(registrationCollection).doc(guildId);
        const configurationRef = this.firestore.collection(configurationCollection).doc(guildId);
        const [registration, existing] = await Promise.all([
          transaction.get(registrationRef),
          transaction.get(configurationRef),
        ]);
        if (!registration.exists || !existing.exists) return { kind: 'not_found' };
        if (!parseStoredGuildRegistration(registration.data(), guildId)) return { kind: 'invalid' };
        const current = parseStoredGuildConfig(existing.data(), guildId);
        if (!current) return { kind: 'invalid' };
        if (current.revision !== expectedRevision)
          return { kind: 'conflict', guild: { guildId, configuration: current } };
        const saved = { ...parsed, enabled: current.enabled, revision: current.revision + 1 };
        transaction.set(configurationRef, toStoredGuildConfig(saved));
        return { kind: 'saved', guild: { guildId, configuration: saved } };
      });
    } catch {
      return { kind: 'unavailable' };
    }
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
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const registrationRef = this.firestore.collection(registrationCollection).doc(guildId);
        const configurationRef = this.firestore.collection(configurationCollection).doc(guildId);
        const [registration, existing] = await Promise.all([
          transaction.get(registrationRef),
          transaction.get(configurationRef),
        ]);
        if (!registration.exists || !existing.exists) return { kind: 'not_found' };
        if (!parseStoredGuildRegistration(registration.data(), guildId)) return { kind: 'invalid' };
        const current = parseStoredGuildConfig(existing.data(), guildId);
        if (!current) return { kind: 'invalid' };
        if (current.revision !== expectedRevision)
          return { kind: 'conflict', guild: { guildId, configuration: current } };
        const saved = { ...current, enabled, revision: current.revision + 1 };
        transaction.set(configurationRef, toStoredGuildConfig(saved));
        return { kind: enabled ? 'enabled' : 'disabled', guild: { guildId, configuration: saved } };
      });
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async deleteGuild(guildId: string): Promise<GuildDeleteResult> {
    if (!isDiscordSnowflake(guildId)) return { kind: 'invalid' };
    try {
      return await this.firestore.runTransaction(async (transaction) => {
        const registrationRef = this.firestore.collection(registrationCollection).doc(guildId);
        const configurationRef = this.firestore.collection(configurationCollection).doc(guildId);
        const registration = await transaction.get(registrationRef);
        if (!registration.exists) return { kind: 'not_found' };
        if (!parseStoredGuildRegistration(registration.data(), guildId)) return { kind: 'invalid' };
        transaction.delete(registrationRef);
        transaction.delete(configurationRef);
        return { kind: 'deleted' };
      });
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async getEnabled(guildId: string): Promise<EnabledConfigLookup> {
    const guild = await this.getGuild(guildId);
    if (guild.kind !== 'found') return guild;
    return guild.guild.configuration?.enabled
      ? { kind: 'found', config: guild.guild.configuration }
      : { kind: 'not_found' };
  }

  async listEnabled(): Promise<EnabledConfigList> {
    const result = await this.listGuilds();
    if (result.kind !== 'found') return result;
    return {
      kind: 'found',
      configs: result.guilds.flatMap((guild) =>
        guild.configuration?.enabled ? [guild.configuration] : [],
      ),
      invalidCount: result.invalidCount,
    };
  }
}
