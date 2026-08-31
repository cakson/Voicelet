import type { VoiceStateChanged, TemporaryRoomConfig } from '../domain/voice-state.js';
import type {
  DiscordClient,
  RoomParentChanged,
  Scheduler,
  ScheduledWork,
  TemporaryRoomObservation,
} from '../ports/index.js';

const retryDelayMs = 15 * 60 * 1000;

export function temporaryRoomName(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = '-room';
  return `${(base || 'temporary').slice(0, 100 - suffix.length)}${suffix}`;
}

export class TemporaryRoomManager {
  // These maps form one transient association invariant: each guild/user key maps to one room,
  // and each guild/room key maps back to that same owner key. Permission state is keyed by room and
  // is cleared together with the reverse association.
  private readonly associations = new Map<string, string>();
  private readonly owners = new Map<string, string>();
  private readonly ownerPermissionState = new Map<string, 'applied' | 'failed'>();
  private readonly work = new Map<string, { generation: number; handle: ScheduledWork }>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    private readonly configurations: Map<string, TemporaryRoomConfig>,
    private readonly discord: DiscordClient,
    schedulerOrObserve: Scheduler | ((event: TemporaryRoomObservation) => void),
    observe?: (event: TemporaryRoomObservation) => void,
  ) {
    this.scheduler =
      typeof schedulerOrObserve === 'function'
        ? {
            schedule: (delayMs, callback) => {
              const timer = setTimeout(callback, delayMs);
              return { cancel: () => clearTimeout(timer) };
            },
          }
        : schedulerOrObserve;
    this.observe =
      typeof schedulerOrObserve === 'function'
        ? schedulerOrObserve
        : (observe ?? (() => undefined));
  }
  private readonly scheduler: Scheduler;
  private readonly observe: (event: TemporaryRoomObservation) => void;

  async handle(event: VoiceStateChanged): Promise<void> {
    if (event.isBot) return;
    const config = this.configurations.get(event.guildId);
    if (
      config &&
      event.channelId === config.triggerChannelId &&
      event.previousChannelId !== config.triggerChannelId
    )
      await this.createOrReuse(event, config);
    for (const roomId of [event.channelId, event.previousChannelId]) {
      if (roomId && this.owners.has(`${event.guildId}:${roomId}`))
        await this.updateLifecycle(event.guildId, roomId, config);
    }
  }

  async externalDeleted(guildId: string, roomId: string): Promise<void> {
    await this.serial(roomId, async () => {
      this.clear(guildId, roomId);
      this.observe('temporary_room_external_deleted');
    });
  }

  dispose(): void {
    for (const item of this.work.values()) item.handle.cancel();
    this.work.clear();
  }

  isKnownManagedRoom(guildId: string, roomId: string): boolean {
    return this.owners.has(`${guildId}:${roomId}`);
  }

  async roomParentChanged(event: RoomParentChanged): Promise<void> {
    const key = `${event.guildId}:${event.roomId}`;
    const owner = this.owners.get(key);
    const config = this.configurations.get(event.guildId);
    if (!owner || !config || event.parentId === config.destinationCategoryId) return;
    await this.serial(key, async () => {
      if (!this.owners.has(key)) return;
      const result = await this.discord.restoreRoomCategory(
        event.guildId,
        event.roomId,
        config.destinationCategoryId,
      );
      if (result === 'missing') return this.clear(event.guildId, event.roomId);
      if (result === 'failed') {
        this.observe('temporary_room_category_restore_failed');
        return;
      }
      this.observe('temporary_room_category_restored');
      const allowance = await this.discord.applyOwnerAllowance(
        event.guildId,
        event.roomId,
        owner.split(':')[1] ?? owner,
      );
      this.ownerPermissionState.set(key, allowance === 'applied' ? 'applied' : 'failed');
      this.observe(
        allowance === 'applied'
          ? 'temporary_room_owner_permission_applied'
          : 'temporary_room_owner_permission_failed',
      );
    });
  }

  private async createOrReuse(
    event: VoiceStateChanged,
    config: TemporaryRoomConfig,
  ): Promise<void> {
    const key = `${event.guildId}:${event.userId}`;
    await this.serial(key, async () => {
      let roomId = this.associations.get(key);
      let createdRoom = false;
      if (roomId) {
        const state = await this.discord.roomState(event.guildId, roomId);
        if (state === 'missing') {
          this.clear(event.guildId, roomId);
          this.observe('temporary_room_stale');
          roomId = undefined;
        } else if (state === 'unavailable') return;
      }
      if (!roomId) {
        const created = await this.discord.createRoom(
          event.guildId,
          config.destinationCategoryId,
          temporaryRoomName(event.displayName),
        );
        if (!created) {
          this.observe('temporary_room_create_failed');
          return;
        }
        roomId = created;
        createdRoom = true;
        this.associations.set(key, roomId);
        this.owners.set(`${event.guildId}:${roomId}`, key);
        this.ownerPermissionState.set(`${event.guildId}:${roomId}`, 'failed');
        this.observe('temporary_room_created');
      } else this.observe('temporary_room_reused');
      const roomKey = `${event.guildId}:${roomId}`;
      if (createdRoom) {
        const result = await this.discord.applyOwnerAllowance(event.guildId, roomId, event.userId);
        this.ownerPermissionState.set(roomKey, result === 'applied' ? 'applied' : 'failed');
        this.observe(
          result === 'applied'
            ? 'temporary_room_owner_permission_applied'
            : 'temporary_room_owner_permission_failed',
        );
      }
      if (!(await this.discord.moveMember(event.guildId, event.userId, roomId))) {
        this.observe('temporary_room_move_failed');
        await this.updateLifecycle(event.guildId, roomId, config);
      }
    });
  }

  private async updateLifecycle(
    guildId: string,
    roomId: string,
    config?: TemporaryRoomConfig,
  ): Promise<void> {
    if (!config) return;
    await this.serial(roomId, async () => {
      const state = await this.discord.roomState(guildId, roomId);
      if (state === 'missing') return this.clear(guildId, roomId);
      if (state === 'unavailable') return;
      if (state !== 'empty') {
        if (this.work.has(roomId)) {
          this.cancel(roomId);
          this.observe('temporary_room_inactivity_cancelled');
        }
        return;
      }
      if (!this.work.has(roomId))
        this.schedule(guildId, roomId, config.inactivityTimeoutMinutes * 60_000);
    });
  }

  private schedule(guildId: string, roomId: string, delay: number): void {
    const generation = (this.work.get(roomId)?.generation ?? 0) + 1;
    const handle = this.scheduler.schedule(delay, () => {
      void this.expire(guildId, roomId, generation);
    });
    this.work.set(roomId, { generation, handle });
    this.observe(
      delay === retryDelayMs
        ? 'temporary_room_retry_scheduled'
        : 'temporary_room_inactivity_started',
    );
  }
  private async expire(guildId: string, roomId: string, generation: number): Promise<void> {
    await this.serial(roomId, async () => {
      if (this.work.get(roomId)?.generation !== generation) return;
      const state = await this.discord.roomState(guildId, roomId);
      if (state === 'missing') return this.clear(guildId, roomId);
      if (state === 'unavailable') {
        this.cancel(roomId);
        this.schedule(guildId, roomId, retryDelayMs);
        return;
      }
      if (state !== 'empty') {
        this.cancel(roomId);
        if (state === 'occupied') this.observe('temporary_room_inactivity_cancelled');
        return;
      }
      const result = await this.discord.deleteRoom(guildId, roomId);
      if (result === 'deleted' || result === 'missing') {
        this.clear(guildId, roomId);
        this.observe('temporary_room_deleted');
      } else {
        this.cancel(roomId);
        this.observe('temporary_room_delete_failed');
        this.schedule(guildId, roomId, retryDelayMs);
      }
    });
  }
  private clear(guildId: string, roomId: string): void {
    this.cancel(roomId);
    const owner = this.owners.get(`${guildId}:${roomId}`);
    if (owner) this.associations.delete(owner);
    this.owners.delete(`${guildId}:${roomId}`);
    this.ownerPermissionState.delete(`${guildId}:${roomId}`);
  }
  private cancel(roomId: string): void {
    const item = this.work.get(roomId);
    item?.handle.cancel();
    this.work.delete(roomId);
  }
  private async serial(key: string, action: () => Promise<void>): Promise<void> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.locks.set(key, queued);
    await previous;
    try {
      await action();
    } finally {
      release();
      if (this.locks.get(key) === queued) this.locks.delete(key);
    }
  }
}
