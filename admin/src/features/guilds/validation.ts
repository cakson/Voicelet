import type { ConfigurationInput } from './types';

const maximumSnowflake = 18_446_744_073_709_551_615n;
const snowflake = /^[1-9][0-9]{0,19}$/;

export function validateSnowflake(value: string): string | undefined {
  if (!snowflake.test(value) || BigInt(value) > maximumSnowflake)
    return 'Enter a valid Discord identifier.';
  return undefined;
}

export function validateConfiguration(input: ConfigurationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of ['triggerChannelId', 'destinationCategoryId'] as const) {
    const error = validateSnowflake(input[field]);
    if (error) errors[field] = error;
  }
  for (const field of ['inactivityTimeoutMinutes', 'reconciliationIntervalMinutes'] as const)
    if (!Number.isInteger(input[field]) || input[field] < 1 || input[field] > 1440)
      errors[field] = 'Enter a whole number from 1 through 1440.';
  const ids = input.permanentChannelIds;
  if (new Set(ids).size !== ids.length) errors.permanentChannelIds = 'Identifiers must be unique.';
  if (ids.some((id) => validateSnowflake(id)))
    errors.permanentChannelIds = 'Enter one valid Discord identifier per line.';
  return errors;
}
