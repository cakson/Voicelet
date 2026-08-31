import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('documentation', () => {
  it('links developers to every required local command', async () => {
    const readme = await readFile('README.md', 'utf8');
    for (const command of ['pnpm dev', 'pnpm check', 'pnpm build'])
      expect(readme).toContain(command);
  });

  it('publishes the local Discord onboarding entry point', async () => {
    const readme = await readFile('README.md', 'utf8');
    expect(readme).toContain('docs/local-discord-development.md');
    expect(readme).toContain('Local Discord development');
  });

  it('keeps the tracked environment example safe and complete', async () => {
    const example = await readFile('.env.example', 'utf8');
    expect(example).toContain('DISCORD_TOKEN=');
    expect(example).toContain('GATEWAY_MODE=discord');
    expect(example).toContain('TEMPORARY_ROOM_CONFIG=');
    expect(example).toContain('Secret:');
    expect(example).toContain('Non-secret');
    expect(example).toContain('127.0.0.1');
    expect(example).toContain('3000');
    expect(example).toContain('<development-server-id>');
    expect(example).toContain('inactivityTimeoutMinutes');
    expect(example).toContain('reconciliationIntervalMinutes');
    expect(example).toContain('permanentChannelIds');
    expect(example).toContain('1-1440');
    expect(example).not.toMatch(/DISCORD_TOKEN=\S+/);
    expect(example).not.toMatch(/\b\d{17,20}\b/);
  });

  it('documents the temporary-room lifecycle timeout and local deletion test', async () => {
    const [readme, guide] = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('docs/local-discord-development.md', 'utf8'),
    ]);
    for (const document of [readme, guide]) {
      expect(document).toContain('inactivityTimeoutMinutes');
      expect(document).toContain('60');
      expect(document).toContain('1');
      expect(document).toContain('1440');
    }
    expect(guide).toContain('automatic deletion');
  });

  it('documents reconciliation category reservation, interval, and zombie recovery', async () => {
    const [readme, guide] = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('docs/local-discord-development.md', 'utf8'),
    ]);
    for (const document of [readme, guide]) {
      expect(document).toContain('reconciliationIntervalMinutes');
      expect(document).toContain('15');
      expect(document).toContain('permanentChannelIds');
      expect(document).toContain('zombie');
    }
    expect(readme).toContain('dedicated Voicelet-managed territory');
    expect(guide).toContain('intentionally does');
  });

  it('covers the required setup, smoke test, security, and troubleshooting contract', async () => {
    const guide = await readFile('docs/local-discord-development.md', 'utf8');
    for (const phrase of [
      'Discord Developer Portal',
      'bot token',
      'personal Discord',
      'normal Discord user account',
      'production credentials',
      'regenerate',
      'dedicated test server',
      'Guild Install',
      'View Channel',
      'Manage Channels',
      'Move Members',
      'Connect',
      'GuildVoiceStates',
      'no privileged',
      'Developer Mode',
      'TEMPORARY_ROOM_CONFIG',
      'triggerChannelId',
      'destinationCategoryId',
      '/livez',
      '/readyz',
      '/metrics',
      'port forwarding',
      'tunnel',
      'public domain',
      'room-creation',
      'existing room',
      'clean',
      'Troubleshooting',
      'voice-state',
      'cannot create',
      'cannot move',
    ]) {
      expect(guide).toContain(phrase);
    }
    expect(guide).not.toContain('user token');
    expect(guide).not.toMatch(/(?:DISCORD_TOKEN|token)\s*[:=]\s*[A-Za-z0-9._-]{20,}/i);
  });
});
