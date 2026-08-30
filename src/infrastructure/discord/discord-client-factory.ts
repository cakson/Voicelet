import { Client, GatewayIntentBits } from 'discord.js';
import type { DiscordClient, DiscordClientFactory, RawVoiceState } from '../../ports/index.js';

class DiscordJsClient implements DiscordClient {
  private readonly client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });

  onReady(listener: () => void): void {
    this.client.once('clientReady', listener);
  }
  onVoiceState(listener: (event: RawVoiceState) => void): void {
    this.client.on('voiceStateUpdate', (_oldState, state) => {
      listener({
        guildId: state.guild.id,
        userId: state.id,
        channelId: state.channelId,
        sessionId: state.sessionId,
      });
    });
  }
  onDisconnect(listener: () => void): void {
    this.client.on('shardDisconnect', listener);
  }
  onReconnect(listener: () => void): void {
    this.client.on('shardReconnecting', listener);
  }
  async login(token: string): Promise<void> {
    await this.client.login(token);
  }
  destroy(): void {
    this.client.destroy();
  }
}

export class DiscordJsClientFactory implements DiscordClientFactory {
  create(): DiscordClient {
    return new DiscordJsClient();
  }
}
