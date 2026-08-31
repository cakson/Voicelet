import { existsSync } from 'node:fs';
import { z } from 'zod';
import type { TemporaryRoomConfig } from '../domain/voice-state.js';

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).optional(),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  SOCKET_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  GATEWAY_MODE: z.enum(['discord', 'simulated']).default('discord'),
  TEMPORARY_ROOM_CONFIG: z.string().default('{}'),
});

export type AppConfig = {
  discordToken?: string;
  host: string;
  port: number;
  socketPath?: string;
  logLevel: z.infer<typeof configSchema>['LOG_LEVEL'];
  gatewayMode: 'discord' | 'simulated';
  temporaryRooms: Map<string, TemporaryRoomConfig>;
};

const roomConfigSchema = z.record(
  z.string().min(1),
  z.object({
    triggerChannelId: z.string().min(1),
    destinationCategoryId: z.string().min(1),
    inactivityTimeoutMinutes: z.number().int().min(1).max(1440).default(60),
  }),
);

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success)
    throw new Error('Invalid environment configuration. Check documented variable names.');
  if (parsed.data.GATEWAY_MODE === 'discord' && !parsed.data.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is required when GATEWAY_MODE=discord.');
  }
  let temporaryRooms: Map<string, TemporaryRoomConfig>;
  try {
    const configured = roomConfigSchema.safeParse(JSON.parse(parsed.data.TEMPORARY_ROOM_CONFIG));
    if (!configured.success) throw new Error();
    temporaryRooms = new Map(Object.entries(configured.data));
  } catch {
    throw new Error('Invalid environment configuration. Check documented variable names.');
  }
  return {
    discordToken: parsed.data.DISCORD_TOKEN,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    socketPath: parsed.data.SOCKET_PATH,
    logLevel: parsed.data.LOG_LEVEL,
    gatewayMode: parsed.data.GATEWAY_MODE,
    temporaryRooms,
  };
}

export function loadEnvironmentFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
