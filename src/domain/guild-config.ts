import { z } from 'zod';
import { discordSnowflakeSchema, isDiscordSnowflake } from './guild-registration.js';

export const guildConfigInputSchema = z.object({
  guildId: discordSnowflakeSchema,
  triggerChannelId: discordSnowflakeSchema,
  destinationCategoryId: discordSnowflakeSchema,
  inactivityTimeoutMinutes: z.number().int().min(1).max(1440).default(60),
  reconciliationIntervalMinutes: z.number().int().min(1).max(1440).default(15),
  permanentChannelIds: z.array(discordSnowflakeSchema).default([]),
  enabled: z.boolean().default(true),
  revision: z.number().int().positive().default(1),
});

export type GuildConfigInput = z.input<typeof guildConfigInputSchema>;
export type GuildConfig = z.output<typeof guildConfigInputSchema>;
export type StoredGuildConfigV1 = Omit<GuildConfig, 'enabled' | 'revision'> & { schemaVersion: 1 };
export type StoredGuildConfigV2 = GuildConfig & { schemaVersion: 2 };

export function isGuildId(value: string): boolean {
  return isDiscordSnowflake(value);
}

export function parseGuildConfig(input: unknown): GuildConfig | undefined {
  const parsed = guildConfigInputSchema.safeParse(input);
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    permanentChannelIds: [...new Set(parsed.data.permanentChannelIds)],
  };
}

export function toStoredGuildConfig(config: GuildConfig): StoredGuildConfigV2 {
  return { schemaVersion: 2, ...config };
}

export function parseStoredGuildConfig(input: unknown, guildId: string): GuildConfig | undefined {
  if (typeof input !== 'object' || input === null || !('schemaVersion' in input)) return undefined;
  const record = input as Record<string, unknown>;
  if (record.guildId !== guildId) return undefined;
  if (record.schemaVersion === 1)
    return parseGuildConfig({ ...record, enabled: true, revision: 1 });
  if (record.schemaVersion === 2) return parseGuildConfig(record);
  return undefined;
}
