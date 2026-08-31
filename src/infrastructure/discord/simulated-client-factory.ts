import type {
  DeleteEmptyRoomResult,
  DeleteRoomResult,
  DiscordClient,
  DiscordClientFactory,
  RawVoiceState,
  RoomState,
  ScheduledWork,
  Scheduler,
  OwnerAllowanceResult,
  RoomCategoryRestorationResult,
  RoomParentChanged,
} from '../../ports/index.js';

export class SimulatedScheduler implements Scheduler {
  private time = 0;
  private readonly jobs: Array<{ at: number; cancelled: boolean; callback: () => void }> = [];

  schedule(delayMs: number, callback: () => void): ScheduledWork {
    const job = { at: this.time + delayMs, cancelled: false, callback };
    this.jobs.push(job);
    return { cancel: () => (job.cancelled = true) };
  }

  async advanceBy(delayMs: number): Promise<void> {
    this.time += delayMs;
    for (const job of this.jobs.filter((item) => !item.cancelled && item.at <= this.time)) {
      job.cancelled = true;
      job.callback();
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

export class SimulatedDiscordClient implements DiscordClient {
  private readyListeners: Array<() => void> = [];
  private voiceListeners: Array<(event: RawVoiceState) => void> = [];
  private disconnectListeners: Array<() => void> = [];
  private reconnectListeners: Array<() => void> = [];
  private errorListeners: Array<() => void> = [];
  private roomDeletedListeners: Array<(guildId: string, roomId: string) => void> = [];
  private roomParentListeners: Array<(event: RoomParentChanged) => void> = [];
  readonly rooms = new Map<string, { guildId: string; categoryId: string; name: string }>();
  readonly ownerAllowances = new Map<
    string,
    { ownerId: string; manageChannels: boolean; manageRoles: boolean }
  >();
  readonly placements = new Map<string, string>();
  readonly deleteAttempts: Array<{ guildId: string; roomId: string }> = [];
  failNextCreate = false;
  failNextMove = false;
  failNextDelete = false;
  failNextCategoryInspection = false;
  failNextRoomInspection = false;
  failNextOwnerAllowance = false;
  failNextCategoryRestore = false;
  autoReady = true;
  private roomSequence = 0;

  onReady(listener: () => void): void {
    this.readyListeners.push(listener);
  }
  onVoiceState(listener: (event: RawVoiceState) => void): void {
    this.voiceListeners.push(listener);
  }
  onDisconnect(listener: () => void): void {
    this.disconnectListeners.push(listener);
  }
  onReconnect(listener: () => void): void {
    this.reconnectListeners.push(listener);
  }
  onError(listener: () => void): void {
    this.errorListeners.push(listener);
  }
  async roomState(guildId: string, roomId: string): Promise<RoomState> {
    if (this.failNextRoomInspection) {
      this.failNextRoomInspection = false;
      return 'unavailable';
    }
    const room = this.rooms.get(roomId);
    if (!room || room.guildId !== guildId) return 'missing';
    return [...this.placements.entries()].some(
      ([key, value]) => key.startsWith(`${guildId}:`) && value === roomId,
    )
      ? 'occupied'
      : 'empty';
  }
  async deleteRoom(guildId: string, roomId: string): Promise<DeleteRoomResult> {
    this.deleteAttempts.push({ guildId, roomId });
    if (this.failNextDelete) {
      this.failNextDelete = false;
      return 'failed';
    }
    if ((await this.roomState(guildId, roomId)) === 'missing') return 'missing';
    this.externalDelete(guildId, roomId);
    return 'deleted';
  }
  async listCategoryVoiceRooms(guildId: string, categoryId: string): Promise<string[] | null> {
    if (this.failNextCategoryInspection) {
      this.failNextCategoryInspection = false;
      return null;
    }
    return [...this.rooms.entries()]
      .filter(([, room]) => room.guildId === guildId && room.categoryId === categoryId)
      .map(([roomId]) => roomId);
  }
  async deleteEmptyRoom(guildId: string, roomId: string): Promise<DeleteEmptyRoomResult> {
    this.deleteAttempts.push({ guildId, roomId });
    if (this.failNextDelete) {
      this.failNextDelete = false;
      return 'failed';
    }
    const state = await this.roomState(guildId, roomId);
    if (state === 'occupied') return 'occupied';
    if (state === 'missing') return 'missing';
    if (state === 'unavailable') return 'failed';
    this.externalDelete(guildId, roomId);
    return 'deleted';
  }
  onRoomDeleted(listener: (guildId: string, roomId: string) => void): void {
    this.roomDeletedListeners.push(listener);
  }
  onRoomParentChanged(listener: (event: RoomParentChanged) => void): void {
    this.roomParentListeners.push(listener);
  }
  async applyOwnerAllowance(
    guildId: string,
    roomId: string,
    ownerId: string,
  ): Promise<OwnerAllowanceResult> {
    if (this.failNextOwnerAllowance) {
      this.failNextOwnerAllowance = false;
      return 'failed';
    }
    const room = this.rooms.get(roomId);
    if (!room || room.guildId !== guildId) return 'missing';
    this.ownerAllowances.set(roomId, { ownerId, manageChannels: true, manageRoles: true });
    return 'applied';
  }
  async restoreRoomCategory(
    guildId: string,
    roomId: string,
    categoryId: string,
  ): Promise<RoomCategoryRestorationResult> {
    if (this.failNextCategoryRestore) {
      this.failNextCategoryRestore = false;
      return 'failed';
    }
    const room = this.rooms.get(roomId);
    if (!room || room.guildId !== guildId) return 'missing';
    if (room.categoryId === categoryId) return 'already_in_category';
    room.categoryId = categoryId;
    this.roomParentListeners.forEach((listener) =>
      listener({ guildId, roomId, parentId: categoryId }),
    );
    return 'restored';
  }
  externalDelete(guildId: string, roomId: string, notify = true): void {
    if (!this.rooms.delete(roomId)) return;
    this.ownerAllowances.delete(roomId);
    for (const [key, value] of this.placements) if (value === roomId) this.placements.delete(key);
    if (notify) this.roomDeletedListeners.forEach((listener) => listener(guildId, roomId));
  }
  async createRoom(guildId: string, categoryId: string, name: string): Promise<string | null> {
    if (this.failNextCreate) {
      this.failNextCreate = false;
      return null;
    }
    const id = `sim-room-${++this.roomSequence}`;
    this.rooms.set(id, { guildId, categoryId, name });
    return id;
  }
  async moveMember(guildId: string, userId: string, roomId: string): Promise<boolean> {
    if (this.failNextMove) {
      this.failNextMove = false;
      return false;
    }
    if ((await this.roomState(guildId, roomId)) === 'missing') return false;
    this.placements.set(`${guildId}:${userId}`, roomId);
    return true;
  }
  async login(token: string): Promise<void> {
    void token;
    if (this.autoReady) queueMicrotask(() => this.emitReady());
  }
  destroy(): void {}
  emitReady(): void {
    this.readyListeners.forEach((listener) => listener());
  }
  seedRoom(guildId: string, roomId: string, categoryId: string, name = 'seeded-room'): void {
    this.rooms.set(roomId, { guildId, categoryId, name });
  }
  moveRoom(guildId: string, roomId: string, categoryId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.guildId !== guildId) return;
    room.categoryId = categoryId ?? '';
    this.roomParentListeners.forEach((listener) =>
      listener({ guildId, roomId, parentId: categoryId }),
    );
  }
  canManageRoom(roomId: string, userId: string): boolean {
    const allowance = this.ownerAllowances.get(roomId);
    return allowance?.ownerId === userId && allowance.manageChannels && allowance.manageRoles;
  }
  setRoomOccupied(guildId: string, roomId: string, occupied: boolean): void {
    const key = `${guildId}:seeded-occupant`;
    if (occupied) this.placements.set(key, roomId);
    else this.placements.delete(key);
  }
  emitVoiceState(event: RawVoiceState): void {
    if (typeof event.guildId === 'string' && typeof event.userId === 'string') {
      const key = `${event.guildId}:${event.userId}`;
      if (typeof event.channelId === 'string' && this.rooms.has(event.channelId))
        this.placements.set(key, event.channelId);
      else this.placements.delete(key);
    }
    this.voiceListeners.forEach((listener) => listener(event));
  }
  emitDisconnect(): void {
    this.disconnectListeners.forEach((listener) => listener());
  }
  emitReconnect(): void {
    this.reconnectListeners.forEach((listener) => listener());
  }
  emitError(): void {
    this.errorListeners.forEach((listener) => listener());
  }
}

export class SimulatedDiscordClientFactory implements DiscordClientFactory {
  readonly client = new SimulatedDiscordClient();
  create(): DiscordClient {
    return this.client;
  }
}
