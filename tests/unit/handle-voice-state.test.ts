import { describe, expect, it } from 'vitest';
import { handleVoiceState } from '../../src/application/handle-voice-state.js';
import { validVoiceState } from '../support/fixtures/voice-state.js';

describe('handleVoiceState', () => {
  it('emits a safe handled observation', () => {
    const events: Record<string, unknown>[] = [];
    const result = handleVoiceState(
      validVoiceState,
      { now: () => new Date() },
      { record: (_event, details) => events.push(details) },
    );
    expect(result.outcome).toBe('handled');
    expect(JSON.stringify(events)).not.toContain('test-user');
  });

  it('rejects invalid input without identifiers', () => {
    const result = handleVoiceState(
      { guildId: 1 },
      { now: () => new Date() },
      { record: () => undefined },
    );
    expect(result.outcome).toBe('rejected');
  });
});
