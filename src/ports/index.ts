export type GatewayState =
  'starting' | 'connecting' | 'ready' | 'reconnecting' | 'disconnected' | 'stopped';

export type RawVoiceState = {
  guildId?: unknown;
  userId?: unknown;
  channelId?: unknown;
  sessionId?: unknown;
};

export interface DiscordClient {
  onReady(listener: () => void): void;
  onVoiceState(listener: (event: RawVoiceState) => void): void;
  onDisconnect(listener: () => void): void;
  onReconnect(listener: () => void): void;
  login(token: string): Promise<void>;
  destroy(): void;
}

export interface DiscordClientFactory {
  create(): DiscordClient;
}

export interface Clock {
  now(): Date;
}

export interface ObservationSink {
  record(
    event: 'voice_state_handled' | 'voice_state_rejected',
    details: Record<string, unknown>,
  ): void;
}
