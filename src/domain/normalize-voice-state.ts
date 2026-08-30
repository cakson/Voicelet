import type { Clock, RawVoiceState } from '../ports/index.js';
import type { VoiceStateChanged } from './voice-state.js';

export function normalizeVoiceState(event: RawVoiceState, clock: Clock): VoiceStateChanged | null {
  if (typeof event.guildId !== 'string' || typeof event.userId !== 'string') return null;
  if (
    event.channelId !== null &&
    event.channelId !== undefined &&
    typeof event.channelId !== 'string'
  ) {
    return null;
  }
  if (event.sessionId !== undefined && typeof event.sessionId !== 'string') return null;

  return {
    guildId: event.guildId,
    userId: event.userId,
    channelId: event.channelId ?? null,
    ...(event.sessionId ? { sessionId: event.sessionId } : {}),
    receivedAt: clock.now(),
  };
}
