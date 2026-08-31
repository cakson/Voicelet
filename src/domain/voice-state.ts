import type { GatewayState } from '../ports/index.js';

export type VoiceStateChanged = {
  guildId: string;
  userId: string;
  channelId: string | null;
  previousChannelId: string | null;
  isBot: boolean;
  displayName: string;
  sessionId?: string;
  receivedAt: Date;
};

export type TemporaryRoomConfig = {
  triggerChannelId: string;
  destinationCategoryId: string;
  inactivityTimeoutMinutes: number;
  reconciliationIntervalMinutes?: number;
  permanentChannelIds?: string[];
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
