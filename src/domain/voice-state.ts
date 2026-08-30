import type { GatewayState } from '../ports/index.js';

export type VoiceStateChanged = {
  guildId: string;
  userId: string;
  channelId: string | null;
  sessionId?: string;
  receivedAt: Date;
};

export type VoiceStateOutcome = {
  eventType: 'voice_state';
  outcome: 'handled' | 'rejected';
  recordedAt: Date;
};

export type Readiness = {
  state: GatewayState;
  changedAt: Date;
  lastErrorClass?: 'configuration' | 'gateway';
};
