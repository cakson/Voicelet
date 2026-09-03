import { z } from 'zod';

export const snowflakeSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,19}$/, 'Enter a valid Discord identifier.');

const configurationFields = {
  triggerChannelId: snowflakeSchema,
  destinationCategoryId: snowflakeSchema,
  inactivityTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  reconciliationIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  permanentChannelIds: z.array(snowflakeSchema).optional(),
  enabled: z.boolean().optional(),
};

export const registerGuildSchema = z.object({
  guildId: snowflakeSchema,
  configuration: z.object(configurationFields).nullable().optional(),
});

export const createConfigurationSchema = z.object({
  ...configurationFields,
  expectedRevision: z.null(),
});

export const replaceConfigurationSchema = z.object({
  triggerChannelId: snowflakeSchema,
  destinationCategoryId: snowflakeSchema,
  inactivityTimeoutMinutes: z.number().int().min(1).max(1440),
  reconciliationIntervalMinutes: z.number().int().min(1).max(1440),
  permanentChannelIds: z.array(snowflakeSchema),
  expectedRevision: z.number().int().positive(),
});

export const saveConfigurationSchema = z.union([
  createConfigurationSchema,
  replaceConfigurationSchema,
]);
export const setEnabledSchema = z.object({
  enabled: z.boolean(),
  expectedRevision: z.number().int().positive(),
});
export const guildParamsSchema = z.object({ guildId: snowflakeSchema });
