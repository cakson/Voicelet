import type { VoiceStateChanged } from '../domain/voice-state.js';
import type { GuildConfig } from '../domain/guild-config.js';
import type {
  DiscordClient,
  RoomParentChanged,
  Scheduler,
  ScheduledWork,
  TemporaryRoomObservation,
} from '../ports/index.js';
import type { GuildConfigRepository } from '../ports/guild-config-repository.js';

const retryDelayMs = 15 * 60 * 1000;

type OwnerPermissionState = 'applied' | 'failed';

interface ManagedRoomAssociation {
  readonly guildId: string;
  readonly ownerId: string;
  readonly roomId: string;
  readonly destinationCategoryId: string;
  ownerPermissionState: OwnerPermissionState;
}

export function temporaryRoomName(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = '-room';
  return `${(base || 'temporary').slice(0, 100 - suffix.length)}${suffix}`;
}

export class TemporaryRoomManager {
  // This is the sole ownership authority. It is intentionally transient: reconciliation must not
  // infer or recreate an owner for a room that is absent from this map.
  private readonly managedRooms = new Map<string, ManagedRoomAssociation>();
  private readonly work = new Map<string, { generation: number; handle: ScheduledWork }>();
  private readonly locks = new Map<string, Promise<void>>();
  private readonly parentOperations = new Map<string, Promise<void>>();
  private readonly deletingRooms = new Set<string>();

  constructor(
    private readonly configurations: GuildConfigRepository,
    private readonly discord: DiscordClient,
    schedulerOrObserve: Scheduler | ((event: TemporaryRoomObservation) => void),
    observe?: (event: TemporaryRoomObservation) => void,
    private readonly observeConfiguration?: (outcome: string) => void,
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
    const config = await this.config(event.guildId);
    if (
      config &&
      event.channelId === config.triggerChannelId &&
      event.previousChannelId !== config.triggerChannelId
    )
      await this.createOrReuse(event, config);
    for (const roomId of [event.channelId, event.previousChannelId]) {
      if (roomId && this.managedRooms.has(this.roomKey(event.guildId, roomId)))
        await this.updateLifecycle(event.guildId, roomId, config);
    }
  }

  async externalDeleted(guildId: string, roomId: string): Promise<void> {
    const key = this.roomKey(guildId, roomId);
    this.deletingRooms.add(key);
    try {
      await this.serial(key, async () => {
        this.clear(guildId, roomId);
        this.observe('temporary_room_external_deleted');
      });
    } finally {
      this.deletingRooms.delete(key);
    }
  }

  dispose(): void {
    for (const item of this.work.values()) item.handle.cancel();
    this.work.clear();
  }

  isKnownManagedRoom(guildId: string, roomId: string): boolean {
    return this.managedRooms.has(this.roomKey(guildId, roomId));
  }

  async roomParentChanged(event: RoomParentChanged): Promise<void> {
    const key = this.roomKey(event.guildId, event.roomId);
    const association = this.managedRooms.get(key);
    const config = await this.config(event.guildId);
    if (
      !association ||
      !config ||
      this.deletingRooms.has(key) ||
      event.parentId === association.destinationCategoryId
    )
      return;
    const active = this.parentOperations.get(key);
    if (active) return active;
    const operation = this.serial(key, async () => {
      if (!this.isActive(association)) return;
      const result = await this.discord.restoreRoomCategory(
        event.guildId,
        event.roomId,
        association.destinationCategoryId,
      );
      if (result === 'missing') return this.clear(event.guildId, event.roomId);
      if (result === 'failed') {
        this.observe('temporary_room_category_restore_failed');
        return;
      }
      if (!this.isActive(association)) return;
      this.observe('temporary_room_category_restored');
      const allowance = await this.discord.applyOwnerAllowance(
        event.guildId,
        event.roomId,
        association.ownerId,
      );
      if (!this.isActive(association)) return;
      association.ownerPermissionState = allowance === 'applied' ? 'applied' : 'failed';
      this.observe(
        allowance === 'applied'
          ? 'temporary_room_owner_permission_applied'
          : 'temporary_room_owner_permission_failed',
      );
    });
    this.parentOperations.set(key, operation);
    try {
      await operation;
    } finally {
      if (this.parentOperations.get(key) === operation) this.parentOperations.delete(key);
    }
  }

  private async config(guildId: string): Promise<GuildConfig | undefined> {
    const result = await this.configurations.get(guildId);
    this.observeConfiguration?.(result.kind);
    return result.kind === 'found' ? result.config : undefined;
  }

  private async createOrReuse(event: VoiceStateChanged, config: GuildConfig): Promise<void> {
    const resources = await this.discord.inspectGuildConfigResources(
      event.guildId,
      config.triggerChannelId,
      config.destinationCategoryId,
    );
    if (resources !== 'valid') {
      this.observe('temporary_room_configuration_invalid');
      return;
    }
    const ownerKey = `${event.guildId}:${event.userId}`;
    await this.serial(ownerKey, async () => {
      let association = this.associationForOwner(event.guildId, event.userId);
      let roomId = association?.roomId;
      let createdRoom = false;
      if (roomId) {
        const state = await this.discord.roomState(event.guildId, roomId);
        if (state === 'missing') {
          this.clear(event.guildId, roomId);
          this.observe('temporary_room_stale');
          association = undefined;
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
        association = {
          guildId: event.guildId,
          ownerId: event.userId,
          roomId,
          destinationCategoryId: config.destinationCategoryId,
          ownerPermissionState: 'failed',
        };
        this.managedRooms.set(this.roomKey(event.guildId, roomId), association);
        this.observe('temporary_room_created');
      } else this.observe('temporary_room_reused');
      if (createdRoom && association) {
        const result = await this.discord.applyOwnerAllowance(event.guildId, roomId, event.userId);
        association.ownerPermissionState = result === 'applied' ? 'applied' : 'failed';
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
    config?: GuildConfig,
  ): Promise<void> {
    if (!config) return;
    await this.serial(this.roomKey(guildId, roomId), async () => {
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
    await this.serial(this.roomKey(guildId, roomId), async () => {
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
    this.managedRooms.delete(this.roomKey(guildId, roomId));
  }
  private associationForOwner(
    guildId: string,
    ownerId: string,
  ): ManagedRoomAssociation | undefined {
    return [...this.managedRooms.values()].find(
      (association) => association.guildId === guildId && association.ownerId === ownerId,
    );
  }
  private roomKey(guildId: string, roomId: string): string {
    return `${guildId}:${roomId}`;
  }
  private isActive(association: ManagedRoomAssociation): boolean {
    const key = this.roomKey(association.guildId, association.roomId);
    return this.managedRooms.get(key) === association && !this.deletingRooms.has(key);
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
