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
  roomState(guildId: string, roomId: string): Promise<RoomState>;
  deleteRoom(guildId: string, roomId: string): Promise<DeleteRoomResult>;
  onRoomDeleted(listener: (guildId: string, roomId: string) => void): void;
  createRoom(guildId: string, categoryId: string, name: string): Promise<string | null>;
  moveMember(guildId: string, userId: string, roomId: string): Promise<boolean>;
  login(token: string): Promise<void>;
  destroy(): void;
}

export type RoomState = 'empty' | 'occupied' | 'missing' | 'unavailable';
export type DeleteRoomResult = 'deleted' | 'missing' | 'failed';

export interface ScheduledWork {
  cancel(): void;
}

export interface Scheduler {
  schedule(delayMs: number, callback: () => void): ScheduledWork;
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
  | 'temporary_room_move_failed'
  | 'temporary_room_inactivity_started'
  | 'temporary_room_inactivity_cancelled'
  | 'temporary_room_deleted'
  | 'temporary_room_delete_failed'
  | 'temporary_room_retry_scheduled'
  | 'temporary_room_external_deleted';
