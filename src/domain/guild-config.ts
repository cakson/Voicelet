import { z } from 'zod';

const identifierSchema = z.string().trim().min(1);

export const guildConfigInputSchema = z.object({
  guildId: identifierSchema,
  triggerChannelId: identifierSchema,
  destinationCategoryId: identifierSchema,
  inactivityTimeoutMinutes: z.number().int().min(1).max(1440).default(60),
  reconciliationIntervalMinutes: z.number().int().min(1).max(1440).default(15),
  permanentChannelIds: z.array(identifierSchema).default([]),
});

export type GuildConfigInput = z.input<typeof guildConfigInputSchema>;
export type GuildConfig = z.output<typeof guildConfigInputSchema>;
export type StoredGuildConfigV1 = GuildConfig & { schemaVersion: 1 };

export function isGuildId(value: string): boolean {
  return identifierSchema.safeParse(value).success;
}

export function parseGuildConfig(input: unknown): GuildConfig | undefined {
  const parsed = guildConfigInputSchema.safeParse(input);
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    permanentChannelIds: [...new Set(parsed.data.permanentChannelIds)],
  };
}

export function toStoredGuildConfig(config: GuildConfig): StoredGuildConfigV1 {
  return { schemaVersion: 1, ...config };
}

export function parseStoredGuildConfig(input: unknown, guildId: string): GuildConfig | undefined {
  if (typeof input !== 'object' || input === null || !('schemaVersion' in input)) return undefined;
  const record = input as Record<string, unknown>;
  if (record.schemaVersion !== 1 || record.guildId !== guildId) return undefined;
  return parseGuildConfig(record);
}
