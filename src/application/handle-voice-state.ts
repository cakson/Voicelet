import type { Clock, ObservationSink, RawVoiceState } from '../ports/index.js';
import { normalizeVoiceState } from '../domain/normalize-voice-state.js';
import type { VoiceStateOutcome } from '../domain/voice-state.js';

export function handleVoiceState(
  event: RawVoiceState,
  clock: Clock,
  observations: ObservationSink,
): VoiceStateOutcome {
  const normalized = normalizeVoiceState(event, clock);
  const outcome: VoiceStateOutcome = {
    eventType: 'voice_state',
    outcome: normalized ? 'handled' : 'rejected',
    recordedAt: clock.now(),
  };
  observations.record(normalized ? 'voice_state_handled' : 'voice_state_rejected', {
    eventType: outcome.eventType,
    outcome: outcome.outcome,
  });
  return outcome;
}
