export type GatewayState =
  'starting' | 'connecting' | 'ready' | 'reconnecting' | 'disconnected' | 'stopped';

export type RawVoiceState = {
  guildId?: unknown;
  userId?: unknown;
  channelId?: unknown;
  previousChannelId?: unknown;
  sessionId?: unknown;
  isBot?: unknown;
  displayName?: unknown;
};

export interface DiscordClient {
  onReady(listener: () => void): void;
  onVoiceState(listener: (event: RawVoiceState) => void): void;
  onDisconnect(listener: () => void): void;
  onReconnect(listener: () => void): void;
  onError(listener: () => void): void;
  roomExists(guildId: string, roomId: string): Promise<boolean>;
  createRoom(guildId: string, categoryId: string, name: string): Promise<string | null>;
  moveMember(guildId: string, userId: string, roomId: string): Promise<boolean>;
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

export type TemporaryRoomObservation =
  | 'temporary_room_created'
  | 'temporary_room_reused'
  | 'temporary_room_stale'
  | 'temporary_room_create_failed'
  | 'temporary_room_move_failed';
