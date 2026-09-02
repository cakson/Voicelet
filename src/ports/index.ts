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
  listCategoryVoiceRooms(guildId: string, categoryId: string): Promise<string[] | null>;
  inspectGuildConfigResources(
    guildId: string,
    triggerChannelId: string,
    destinationCategoryId: string,
  ): Promise<GuildConfigResourceInspection>;
  deleteEmptyRoom(guildId: string, roomId: string): Promise<DeleteEmptyRoomResult>;
  onRoomDeleted(listener: (guildId: string, roomId: string) => void): void;
  onRoomParentChanged(listener: (event: RoomParentChanged) => void): void;
  applyOwnerAllowance(
    guildId: string,
    roomId: string,
    ownerId: string,
  ): Promise<OwnerAllowanceResult>;
  restoreRoomCategory(
    guildId: string,
    roomId: string,
    categoryId: string,
  ): Promise<RoomCategoryRestorationResult>;
  createRoom(guildId: string, categoryId: string, name: string): Promise<string | null>;
  moveMember(guildId: string, userId: string, roomId: string): Promise<boolean>;
  login(token: string): Promise<void>;
  destroy(): void;
}

export type OwnerAllowanceResult = 'applied' | 'missing' | 'failed';
export type RoomCategoryRestorationResult =
  'restored' | 'already_in_category' | 'missing' | 'failed';
export type RoomParentChanged = {
  guildId: string;
  roomId: string;
  parentId?: string;
};

export type RoomState = 'empty' | 'occupied' | 'missing' | 'unavailable';
export type GuildConfigResourceInspection = 'valid' | 'missing' | 'wrong_type' | 'unavailable';
export type DeleteRoomResult = 'deleted' | 'missing' | 'failed';
export type DeleteEmptyRoomResult = DeleteRoomResult | 'occupied';

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
  | 'temporary_room_external_deleted'
  | 'temporary_room_owner_permission_applied'
  | 'temporary_room_owner_permission_failed'
  | 'temporary_room_category_restored'
  | 'temporary_room_category_restore_failed'
  | 'temporary_room_configuration_invalid';

export type ReconciliationObservation =
  | 'reconciliation_started'
  | 'reconciliation_completed'
  | 'reconciliation_category_unavailable'
  | 'reconciliation_permanent_preserved'
  | 'reconciliation_known_preserved'
  | 'reconciliation_zombie_occupied'
  | 'reconciliation_zombie_deleted'
  | 'reconciliation_inspection_failed'
  | 'reconciliation_delete_failed';
