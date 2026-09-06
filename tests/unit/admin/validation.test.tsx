import { describe, expect, it } from 'vitest';
import {
  validateConfiguration,
  validateSnowflake,
} from '../../../admin/src/features/guilds/validation';

describe('administration form validation', () => {
  it('rejects invalid Discord identifiers and invalid settings before requests', () => {
    expect(validateSnowflake('bad')).toBeDefined();
    expect(
      validateConfiguration({
        triggerChannelId: 'bad',
        destinationCategoryId: '323456789012345678',
        inactivityTimeoutMinutes: 0,
        reconciliationIntervalMinutes: 15,
        permanentChannelIds: [],
        enabled: true,
      }),
    ).toMatchObject({
      triggerChannelId: expect.any(String),
      inactivityTimeoutMinutes: expect.any(String),
    });
  });
});
