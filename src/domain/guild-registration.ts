import { z } from 'zod';

const maximumSnowflake = 18_446_744_073_709_551_615n;

export const discordSnowflakeSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/)
  .refine(
    (value) => /^[1-9][0-9]{0,19}$/.test(value) && BigInt(value) <= maximumSnowflake,
    'Identifier exceeds unsigned 64-bit range',
  );

export const guildRegistrationSchema = z.object({ guildId: discordSnowflakeSchema });

export type GuildRegistration = z.output<typeof guildRegistrationSchema>;
export type StoredGuildRegistrationV1 = GuildRegistration & { schemaVersion: 1 };

export function isDiscordSnowflake(value: string): boolean {
  return discordSnowflakeSchema.safeParse(value).success;
}

export function parseGuildRegistration(input: unknown): GuildRegistration | undefined {
  const parsed = guildRegistrationSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

export function toStoredGuildRegistration(
  registration: GuildRegistration,
): StoredGuildRegistrationV1 {
  return { schemaVersion: 1, ...registration };
}

export function parseStoredGuildRegistration(
  input: unknown,
  guildId: string,
): GuildRegistration | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const record = input as Record<string, unknown>;
  if (record.schemaVersion !== 1 || record.guildId !== guildId) return undefined;
  return parseGuildRegistration(record);
}
