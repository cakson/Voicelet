import { describe, expect, it } from 'vitest';
import {
  parseGuildConfig,
  parseStoredGuildConfig,
  toStoredGuildConfig,
} from '../../src/domain/guild-config.js';

const guildId = '123456789012345678';
const triggerChannelId = '223456789012345678';
const destinationCategoryId = '323456789012345678';

describe('guild configuration', () => {
  it('normalizes defaults, enabled state, revision, and duplicate permanent channels', () => {
    expect(
      parseGuildConfig({
        guildId,
        triggerChannelId,
        destinationCategoryId,
        permanentChannelIds: ['423456789012345678', '423456789012345678'],
      }),
    ).toEqual({
      guildId,
      triggerChannelId,
      destinationCategoryId,
      inactivityTimeoutMinutes: 60,
      reconciliationIntervalMinutes: 15,
      permanentChannelIds: ['423456789012345678'],
      enabled: true,
      revision: 1,
    });
  });

  it('reads legacy V1 as enabled revision one and writes V2', () => {
    const legacy = {
      schemaVersion: 1,
      guildId,
      triggerChannelId,
      destinationCategoryId,
      inactivityTimeoutMinutes: 30,
      reconciliationIntervalMinutes: 10,
      permanentChannelIds: [],
    };
    expect(parseStoredGuildConfig(legacy, guildId)).toMatchObject({ enabled: true, revision: 1 });
    expect(toStoredGuildConfig(parseStoredGuildConfig(legacy, guildId)!)).toMatchObject({
      schemaVersion: 2,
      enabled: true,
      revision: 1,
    });
  });

  it('rejects invalid values and unsupported stored versions', () => {
    expect(
      parseGuildConfig({ guildId: '', triggerChannelId, destinationCategoryId }),
    ).toBeUndefined();
    expect(
      parseStoredGuildConfig(
        { schemaVersion: 99, guildId, triggerChannelId, destinationCategoryId },
        guildId,
      ),
    ).toBeUndefined();
    const valid = parseGuildConfig({ guildId, triggerChannelId, destinationCategoryId })!;
    expect(
      parseStoredGuildConfig(toStoredGuildConfig(valid), '523456789012345678'),
    ).toBeUndefined();
  });

  it('rejects malformed permanent identifiers', () => {
    expect(
      parseGuildConfig({
        guildId,
        triggerChannelId,
        destinationCategoryId,
        permanentChannelIds: ['bad'],
      }),
    ).toBeUndefined();
  });
});
