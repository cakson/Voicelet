import type { TemporaryRoomConfig } from '../domain/voice-state.js';
import type {
  DiscordClient,
  ReconciliationObservation,
  ScheduledWork,
  Scheduler,
} from '../ports/index.js';

const minuteMs = 60_000;

export class TemporaryRoomReconciler {
  private readonly scheduled = new Map<string, ScheduledWork>();
  private readonly running = new Set<string>();
  private readonly queued = new Set<string>();
  private active = false;
  private disposed = false;

  constructor(
    private readonly configurations: Map<string, TemporaryRoomConfig>,
    private readonly discord: DiscordClient,
    private readonly scheduler: Scheduler,
    private readonly isKnownManagedRoom: (guildId: string, roomId: string) => boolean,
    private readonly observe: (event: ReconciliationObservation) => void,
  ) {}

  start(): void {
    if (this.disposed) return;
    this.active = true;
    for (const guildId of this.configurations.keys()) this.request(guildId);
  }

  pause(): void {
    this.active = false;
    for (const scheduled of this.scheduled.values()) scheduled.cancel();
    this.scheduled.clear();
    this.queued.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.pause();
  }

  request(guildId: string): void {
    if (this.disposed || !this.active || !this.configurations.has(guildId)) return;
    if (this.running.has(guildId)) {
      this.queued.add(guildId);
      return;
    }
    void this.run(guildId);
  }

  private async run(guildId: string): Promise<void> {
    const config = this.configurations.get(guildId);
    if (!config || this.disposed) return;
    this.running.add(guildId);
    this.observe('reconciliation_started');
    try {
      const candidates = await this.discord.listCategoryVoiceRooms(
        guildId,
        config.destinationCategoryId,
      );
      if (candidates === null) this.observe('reconciliation_category_unavailable');
      else for (const roomId of candidates) await this.reconcileCandidate(guildId, roomId, config);
    } catch {
      this.observe('reconciliation_inspection_failed');
    } finally {
      this.running.delete(guildId);
      this.observe('reconciliation_completed');
      if (!this.disposed && this.active) this.schedule(guildId, config);
      if (this.queued.delete(guildId) && !this.disposed && this.active) this.request(guildId);
    }
  }

  private schedule(guildId: string, config: TemporaryRoomConfig): void {
    this.scheduled.get(guildId)?.cancel();
    const interval = config.reconciliationIntervalMinutes ?? 15;
    this.scheduled.set(
      guildId,
      this.scheduler.schedule(interval * minuteMs, () => this.request(guildId)),
    );
  }

  private isPermanent(roomId: string, config: TemporaryRoomConfig): boolean {
    return (
      roomId === config.triggerChannelId || (config.permanentChannelIds ?? []).includes(roomId)
    );
  }

  private async reconcileCandidate(
    guildId: string,
    roomId: string,
    config: TemporaryRoomConfig,
  ): Promise<void> {
    if (this.isPermanent(roomId, config)) {
      this.observe('reconciliation_permanent_preserved');
      return;
    }
    if (this.isKnownManagedRoom(guildId, roomId)) {
      this.observe('reconciliation_known_preserved');
      return;
    }
    try {
      const state = await this.discord.roomState(guildId, roomId);
      if (state === 'unavailable') {
        this.observe('reconciliation_inspection_failed');
        return;
      }
      if (state === 'occupied') {
        this.observe('reconciliation_zombie_occupied');
        return;
      }
      if (state !== 'empty') return;
      if (this.isPermanent(roomId, config) || this.isKnownManagedRoom(guildId, roomId)) return;
      const result = await this.discord.deleteEmptyRoom(guildId, roomId);
      if (result === 'deleted') this.observe('reconciliation_zombie_deleted');
      else if (result === 'occupied') this.observe('reconciliation_zombie_occupied');
      else if (result === 'failed') this.observe('reconciliation_delete_failed');
    } catch {
      this.observe('reconciliation_inspection_failed');
    }
  }
}
