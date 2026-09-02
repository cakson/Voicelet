import { existsSync } from 'node:fs';
import { z } from 'zod';

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).optional(),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
  SOCKET_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  GATEWAY_MODE: z.enum(['discord', 'simulated']).default('discord'),
  SIMULATED_AUTO_READY: z.enum(['true', 'false']).default('true'),
  PERSISTENCE_PROVIDER: z.enum(['memory', 'firestore']).default('memory'),
  FIRESTORE_PROJECT_ID: z.string().min(1).optional(),
});

export type AppConfig = {
  discordToken?: string;
  host: string;
  port: number;
  socketPath?: string;
  logLevel: z.infer<typeof configSchema>['LOG_LEVEL'];
  gatewayMode: 'discord' | 'simulated';
  simulatedAutoReady: boolean;
  persistenceProvider: 'memory' | 'firestore';
  firestoreProjectId?: string;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success)
    throw new Error('Invalid environment configuration. Check documented variable names.');
  if (parsed.data.GATEWAY_MODE === 'discord' && !parsed.data.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is required when GATEWAY_MODE=discord.');
  }
  return {
    discordToken: parsed.data.DISCORD_TOKEN,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    socketPath: parsed.data.SOCKET_PATH,
    logLevel: parsed.data.LOG_LEVEL,
    gatewayMode: parsed.data.GATEWAY_MODE,
    simulatedAutoReady: parsed.data.SIMULATED_AUTO_READY === 'true',
    persistenceProvider: parsed.data.PERSISTENCE_PROVIDER,
    firestoreProjectId: parsed.data.FIRESTORE_PROJECT_ID,
  };
}

export function loadEnvironmentFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
