import type { DiscordClient, DiscordClientFactory, RawVoiceState } from '../../ports/index.js';

export class SimulatedDiscordClient implements DiscordClient {
  private readyListeners: Array<() => void> = [];
  private voiceListeners: Array<(event: RawVoiceState) => void> = [];
  private disconnectListeners: Array<() => void> = [];
  private reconnectListeners: Array<() => void> = [];

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
  async login(token: string): Promise<void> {
    void token;
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
}

export class SimulatedDiscordClientFactory implements DiscordClientFactory {
  readonly client = new SimulatedDiscordClient();
  create(): DiscordClient {
    return this.client;
  }
}
