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

  it('documents deterministic persistence seed and reset boundaries', async () => {
    const guide = await readFile('docs/local-discord-development.md', 'utf8');
    expect(guide).toContain('pnpm guild-config:seed');
    expect(guide).toContain('stopping and restarting the emulator');
    expect(guide).toContain('local-only');
  });

  it('keeps the tracked environment example safe and complete', async () => {
    const example = await readFile('.env.example', 'utf8');
    expect(example).toContain('DISCORD_TOKEN=');
    expect(example).toContain('GATEWAY_MODE=discord');
    expect(example).toContain('PERSISTENCE_PROVIDER=firestore');
    expect(example).toContain('Secret:');
    expect(example).toContain('Non-secret');
    expect(example).toContain('127.0.0.1');
    expect(example).toContain('3000');
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
      'PERSISTENCE_PROVIDER',
      'triggerChannelId',
      'destinationCategoryId',
      'Firestore',
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

  it('documents room-owner scope and bot-only authority', async () => {
    const [readme, guide] = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('docs/local-discord-development.md', 'utf8'),
    ]);
    for (const phrase of [
      'Manage Roles',
      'member-specific',
      'Administrator',
      'two ordinary test members',
    ]) {
      expect(`${readme}\n${guide}`).toContain(phrase);
    }
    expect(readme).toContain('reconciliation never expands');
  });

  it('does not retain runtime-map guild configuration guidance', async () => {
    const [readme, deployment] = await Promise.all([
      readFile('README.md', 'utf8'),
      readFile('docs/deployment.md', 'utf8'),
    ]);
    for (const document of [readme, deployment]) {
      expect(document).not.toMatch(/servers omitted from the map|mapping entries/i);
      expect(document).not.toContain('TEMPORARY_ROOM_CONFIG');
    }
  });
});
