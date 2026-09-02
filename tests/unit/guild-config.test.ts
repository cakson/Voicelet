import { describe, expect, it } from 'vitest';
import {
  parseGuildConfig,
  parseStoredGuildConfig,
  toStoredGuildConfig,
} from '../../src/domain/guild-config.js';

describe('guild configuration', () => {
  it('normalizes defaults and duplicate permanent channels', () => {
    expect(
      parseGuildConfig({
        guildId: 'g',
        triggerChannelId: 't',
        destinationCategoryId: 'c',
        permanentChannelIds: ['p', 'p'],
      }),
    ).toEqual({
      guildId: 'g',
      triggerChannelId: 't',
      destinationCategoryId: 'c',
      inactivityTimeoutMinutes: 60,
      reconciliationIntervalMinutes: 15,
      permanentChannelIds: ['p'],
    });
  });
  it('rejects invalid values and unsupported stored versions', () => {
    expect(
      parseGuildConfig({ guildId: '', triggerChannelId: 't', destinationCategoryId: 'c' }),
    ).toBeUndefined();
    const valid = parseGuildConfig({
      guildId: 'g',
      triggerChannelId: 't',
      destinationCategoryId: 'c',
    })!;
    expect(
      parseStoredGuildConfig({ ...toStoredGuildConfig(valid), schemaVersion: 2 }, 'g'),
    ).toBeUndefined();
    expect(parseStoredGuildConfig(toStoredGuildConfig(valid), 'other')).toBeUndefined();
  });
});
