import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, loadEnvironmentFile } from '../../src/config/load-config.js';

describe('documented environment configuration', () => {
  const originalGatewayMode = process.env.GATEWAY_MODE;

  afterEach(() => {
    if (originalGatewayMode === undefined) delete process.env.GATEWAY_MODE;
    else process.env.GATEWAY_MODE = originalGatewayMode;
  });

  it('loads a local environment file before validating the worker configuration', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'voicelet-config-'));
    const envFile = join(directory, '.env');
    await writeFile(envFile, 'GATEWAY_MODE=simulated\n', 'utf8');
    delete process.env.GATEWAY_MODE;
    loadEnvironmentFile(envFile);
    expect(loadConfig().gatewayMode).toBe('simulated');
    await rm(directory, { recursive: true, force: true });
  });

  it('rejects missing production credentials without exposing values', () => {
    expect(() => loadConfig({ GATEWAY_MODE: 'discord' })).toThrow('DISCORD_TOKEN is required');
    try {
      loadConfig({ GATEWAY_MODE: 'discord', PORT: 'not-a-port', DISCORD_TOKEN: 'secret-value' });
    } catch (error) {
      expect(String(error)).not.toContain('secret-value');
    }
  });

  it('rejects invalid values with a redaction-safe message', () => {
    expect(() => loadConfig({ GATEWAY_MODE: 'simulated', PORT: 'not-a-port' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('loads independent multi-server temporary-room mappings', () => {
    const config = loadConfig({
      GATEWAY_MODE: 'simulated',
      TEMPORARY_ROOM_CONFIG: JSON.stringify({
        'guild-one': { triggerChannelId: 'trigger-one', destinationCategoryId: 'category-one' },
        'guild-two': { triggerChannelId: 'trigger-two', destinationCategoryId: 'category-two' },
      }),
    });
    expect(config.temporaryRooms.get('guild-one')).toEqual({
      triggerChannelId: 'trigger-one',
      destinationCategoryId: 'category-one',
      inactivityTimeoutMinutes: 60,
      reconciliationIntervalMinutes: 15,
      permanentChannelIds: [],
    });
    expect(config.temporaryRooms).toHaveLength(2);
    expect(loadConfig({ GATEWAY_MODE: 'simulated' }).temporaryRooms).toHaveLength(0);
  });

  it('accepts only whole-minute inactivity timeouts within the documented range', () => {
    const configuration = (inactivityTimeoutMinutes: unknown) =>
      loadConfig({
        GATEWAY_MODE: 'simulated',
        TEMPORARY_ROOM_CONFIG: JSON.stringify({
          guild: {
            triggerChannelId: 'trigger',
            destinationCategoryId: 'category',
            inactivityTimeoutMinutes,
          },
        }),
      });
    expect(configuration(1).temporaryRooms.get('guild')?.inactivityTimeoutMinutes).toBe(1);
    expect(configuration(1440).temporaryRooms.get('guild')?.inactivityTimeoutMinutes).toBe(1440);
    for (const invalid of [0, 1441, 1.5, '60', null]) {
      expect(() => configuration(invalid)).toThrow('Invalid environment configuration');
    }
  });

  it('defaults and validates reconciliation settings without retaining duplicate exclusions', () => {
    const configuration = (reconciliationIntervalMinutes: unknown) =>
      loadConfig({
        GATEWAY_MODE: 'simulated',
        TEMPORARY_ROOM_CONFIG: JSON.stringify({
          guild: {
            triggerChannelId: 'trigger',
            destinationCategoryId: 'category',
            reconciliationIntervalMinutes,
            permanentChannelIds: ['permanent', 'permanent'],
          },
        }),
      });
    expect(
      loadConfig({
        GATEWAY_MODE: 'simulated',
        TEMPORARY_ROOM_CONFIG: JSON.stringify({
          guild: { triggerChannelId: 'trigger', destinationCategoryId: 'category' },
        }),
      }).temporaryRooms.get('guild')?.reconciliationIntervalMinutes,
    ).toBe(15);
    expect(configuration(1).temporaryRooms.get('guild')?.permanentChannelIds).toEqual([
      'permanent',
    ]);
    expect(configuration(1440).temporaryRooms.get('guild')?.reconciliationIntervalMinutes).toBe(
      1440,
    );
    for (const invalid of [0, 1441, 1.5, '15', null])
      expect(() => configuration(invalid)).toThrow('Invalid environment configuration');
  });

  it('rejects malformed temporary-room mappings without exposing their contents', () => {
    const secret = 'should-not-be-logged';
    const malformed = JSON.stringify({ guild: secret });
    expect(() =>
      loadConfig({ GATEWAY_MODE: 'simulated', TEMPORARY_ROOM_CONFIG: malformed }),
    ).toThrow('Invalid environment configuration');
    try {
      loadConfig({ GATEWAY_MODE: 'simulated', TEMPORARY_ROOM_CONFIG: malformed });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
