import type { DiscordClient, DiscordClientFactory, RawVoiceState } from '../../ports/index.js';

export class SimulatedDiscordClient implements DiscordClient {
  private readyListeners: Array<() => void> = [];
  private voiceListeners: Array<(event: RawVoiceState) => void> = [];
  private disconnectListeners: Array<() => void> = [];
  private reconnectListeners: Array<() => void> = [];
  private errorListeners: Array<() => void> = [];
  readonly rooms = new Map<string, { guildId: string; categoryId: string; name: string }>();
  readonly placements = new Map<string, string>();
  failNextCreate = false;
  failNextMove = false;
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
  async roomExists(guildId: string, roomId: string): Promise<boolean> {
    return this.rooms.get(roomId)?.guildId === guildId;
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
    if (!(await this.roomExists(guildId, roomId))) return false;
    this.placements.set(`${guildId}:${userId}`, roomId);
    return true;
  }
  async login(token: string): Promise<void> {
    void token;
    queueMicrotask(() => this.emitReady());
  }
  destroy(): void {}
  emitReady(): void {
    this.readyListeners.forEach((listener) => listener());
  }
  emitVoiceState(event: RawVoiceState): void {
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
