export type GuildConfigurationChange =
  'configured' | 'interval_changed' | 'enabled' | 'disabled' | 'deleted';

export interface GuildConfigChangeNotifier {
  configurationChanged(guildId: string, change: GuildConfigurationChange): Promise<void>;
}
