import { describe, expect, it } from 'vitest';
import {
  isDiscordSnowflake,
  parseGuildRegistration,
  parseStoredGuildRegistration,
  toStoredGuildRegistration,
} from '../../src/domain/guild-registration.js';

describe('guild registration', () => {
  it('accepts canonical positive unsigned 64-bit Discord snowflakes', () => {
    expect(isDiscordSnowflake('1')).toBe(true);
    expect(isDiscordSnowflake('18446744073709551615')).toBe(true);
    expect(parseGuildRegistration({ guildId: '123456789012345678' })).toEqual({
      guildId: '123456789012345678',
    });
  });

  it.each(['', ' 1', '1 ', '0', '01', '-1', '+1', '1.0', '1e3', 'abc', '18446744073709551616'])(
    'rejects non-canonical identifier %j',
    (value) => expect(isDiscordSnowflake(value)).toBe(false),
  );

  it('round-trips V1 registrations and rejects mismatched document identity', () => {
    const registration = { guildId: '123456789012345678' };
    const stored = toStoredGuildRegistration(registration);
    expect(stored).toEqual({ schemaVersion: 1, ...registration });
    expect(parseStoredGuildRegistration(stored, registration.guildId)).toEqual(registration);
    expect(parseStoredGuildRegistration(stored, '223456789012345678')).toBeUndefined();
  });
});
