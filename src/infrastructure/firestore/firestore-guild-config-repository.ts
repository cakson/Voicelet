import type { Firestore } from '@google-cloud/firestore';
import {
  parseGuildConfig,
  parseStoredGuildConfig,
  toStoredGuildConfig,
  type GuildConfigInput,
} from '../../domain/guild-config.js';
import type {
  GuildConfigList,
  GuildConfigLookup,
  GuildConfigRepository,
  GuildConfigSave,
} from '../../ports/guild-config-repository.js';

const collectionName = 'guildConfigurations';

export class FirestoreGuildConfigRepository implements GuildConfigRepository {
  constructor(private readonly firestore: Firestore) {}

  async get(guildId: string): Promise<GuildConfigLookup> {
    try {
      const snapshot = await this.firestore.collection(collectionName).doc(guildId).get();
      if (!snapshot.exists) return { kind: 'not_found' };
      const config = parseStoredGuildConfig(snapshot.data(), guildId);
      return config ? { kind: 'found', config } : { kind: 'invalid' };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async list(): Promise<GuildConfigList> {
    try {
      const snapshot = await this.firestore.collection(collectionName).get();
      const configs = [];
      let invalidCount = 0;
      for (const document of snapshot.docs) {
        const config = parseStoredGuildConfig(document.data(), document.id);
        if (config) configs.push(config);
        else invalidCount++;
      }
      return { kind: 'found', configs, invalidCount };
    } catch {
      return { kind: 'unavailable' };
    }
  }

  async save(input: GuildConfigInput): Promise<GuildConfigSave> {
    const config = parseGuildConfig(input);
    if (!config) return { kind: 'invalid' };
    try {
      await this.firestore
        .collection(collectionName)
        .doc(config.guildId)
        .set(toStoredGuildConfig(config));
      return { kind: 'saved', config };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}
