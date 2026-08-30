import { describe, expect, it } from 'vitest';
import { normalizeVoiceState } from '../../src/domain/normalize-voice-state.js';
import { validVoiceState } from '../support/fixtures/voice-state.js';

const clock = { now: () => new Date('2026-08-30T00:00:00.000Z') };

describe('normalizeVoiceState', () => {
  it('normalizes a join event', () =>
    expect(normalizeVoiceState(validVoiceState, clock)?.channelId).toBe('test-channel'));
  it('normalizes a move event', () =>
    expect(
      normalizeVoiceState({ ...validVoiceState, channelId: 'test-channel-next' }, clock)?.channelId,
    ).toBe('test-channel-next'));
  it('normalizes a leave event', () =>
    expect(
      normalizeVoiceState({ ...validVoiceState, channelId: null }, clock)?.channelId,
    ).toBeNull());
  it('rejects malformed identifiers', () =>
    expect(normalizeVoiceState({ guildId: 1, userId: 'user' }, clock)).toBeNull());
  it('rejects malformed optional fields', () => {
    expect(normalizeVoiceState({ ...validVoiceState, channelId: 1 }, clock)).toBeNull();
    expect(normalizeVoiceState({ ...validVoiceState, sessionId: 1 }, clock)).toBeNull();
  });
});
