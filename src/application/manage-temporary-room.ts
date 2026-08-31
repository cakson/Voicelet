import type { VoiceStateChanged, TemporaryRoomConfig } from '../domain/voice-state.js';
import type { DiscordClient, TemporaryRoomObservation } from '../ports/index.js';

export function temporaryRoomName(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'temporary'}-room`.slice(0, 100);
}

export class TemporaryRoomManager {
  private readonly associations = new Map<string, string>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    private readonly configurations: Map<string, TemporaryRoomConfig>,
    private readonly discord: DiscordClient,
    private readonly observe: (event: TemporaryRoomObservation) => void,
  ) {}

  async handle(event: VoiceStateChanged): Promise<void> {
    const config = this.configurations.get(event.guildId);
    if (
      !config ||
      event.isBot ||
      event.channelId !== config.triggerChannelId ||
      event.previousChannelId === config.triggerChannelId
    )
      return;
    const key = `${event.guildId}:${event.userId}`;
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.locks.set(key, queued);
    await previous;
    try {
      let roomId = this.associations.get(key);
      if (roomId && !(await this.discord.roomExists(event.guildId, roomId))) {
        this.associations.delete(key);
        roomId = undefined;
        this.observe('temporary_room_stale');
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
        this.associations.set(key, roomId);
        this.observe('temporary_room_created');
      } else this.observe('temporary_room_reused');
      if (!(await this.discord.moveMember(event.guildId, event.userId, roomId)))
        this.observe('temporary_room_move_failed');
    } finally {
      release();
      if (this.locks.get(key) === queued) this.locks.delete(key);
    }
  }
}
