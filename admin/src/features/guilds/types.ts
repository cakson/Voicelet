export type GuildConfiguration = {
  triggerChannelId: string;
  destinationCategoryId: string;
  inactivityTimeoutMinutes: number;
  reconciliationIntervalMinutes: number;
  permanentChannelIds: string[];
  enabled: boolean;
  revision: number;
};

export type GuildDetail = { guildId: string; configuration: GuildConfiguration | null };
export type GuildSummary = {
  guildId: string;
  configurationStatus: 'configured' | 'unconfigured';
  enabled: boolean | null;
};
export type ConfigurationInput = Omit<GuildConfiguration, 'revision'>;
export type ApiError = Error & { code?: string; fields?: Record<string, string> };
