import { ChannelType, Client, GatewayIntentBits } from 'discord.js';
import type {
  DeleteRoomResult,
  DiscordClient,
  DiscordClientFactory,
  RawVoiceState,
  RoomState,
} from '../../ports/index.js';

export class DiscordJsClient implements DiscordClient {
  constructor(
    private readonly client: Client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] }),
  ) {}

  onReady(listener: () => void): void {
    this.client.once('clientReady', listener);
    this.client.on('shardReady', listener);
  }
  onVoiceState(listener: (event: RawVoiceState) => void): void {
    this.client.on('voiceStateUpdate', (oldState, state) => {
      listener({
        guildId: state.guild.id,
        userId: state.id,
        channelId: state.channelId,
        previousChannelId: oldState.channelId,
        sessionId: state.sessionId,
        isBot: state.member?.user.bot ?? false,
        displayName: state.member?.displayName ?? state.member?.user.username ?? 'temporary-room',
      });
    });
  }
  async roomState(guildId: string, roomId: string): Promise<RoomState> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return 'unavailable';
      const channel = await guild.channels.fetch(roomId);
      if (!channel || channel.type !== ChannelType.GuildVoice) return 'missing';
      return channel.members.size === 0 ? 'empty' : 'occupied';
    } catch {
      return 'unavailable';
    }
  }
  async deleteRoom(guildId: string, roomId: string): Promise<DeleteRoomResult> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return 'failed';
      const channel = await guild.channels.fetch(roomId);
      if (!channel || channel.type !== ChannelType.GuildVoice) return 'missing';
      await channel.delete();
      return 'deleted';
    } catch {
      return 'failed';
    }
  }
  onRoomDeleted(listener: (guildId: string, roomId: string) => void): void {
    this.client.on('channelDelete', (channel) => {
      if (channel.type === ChannelType.GuildVoice) listener(channel.guild.id, channel.id);
    });
  }
  async createRoom(guildId: string, categoryId: string, name: string): Promise<string | null> {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return null;
      return (
        await guild.channels.create({ name, type: ChannelType.GuildVoice, parent: categoryId })
      ).id;
    } catch {
      return null;
    }
  }
  async moveMember(guildId: string, userId: string, roomId: string): Promise<boolean> {
    try {
      const member = await this.client.guilds.cache.get(guildId)?.members.fetch(userId);
      if (!member) return false;
      await member.voice.setChannel(roomId);
      return true;
    } catch {
      return false;
    }
  }
  onDisconnect(listener: () => void): void {
    this.client.on('shardDisconnect', listener);
  }
  onReconnect(listener: () => void): void {
    this.client.on('shardReconnecting', listener);
  }
  onError(listener: () => void): void {
    this.client.on('error', () => listener());
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
