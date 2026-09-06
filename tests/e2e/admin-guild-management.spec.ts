import { expect, test } from '@playwright/test';
import { fork, type ChildProcess } from 'node:child_process';
import { emulatorFirestore, resetGuildConfigEmulator } from '../support/firestore-emulator.js';

const guildId = '100000000000000101';
const triggerId = '100000000000000102';
const updatedTriggerId = '100000000000000103';
const categoryId = '100000000000000104';
const replacementGuildId = '100000000000000105';
const firestore = emulatorFirestore();

test.beforeEach(async () => {
  await resetGuildConfigEmulator(firestore);
});

async function waitForReady(port: number) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/readyz`)).ok) return;
    } catch {
      // The restarted process is still binding its listener.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Voicelet did not become ready on port ${port}.`);
}

async function stop(worker: ChildProcess) {
  const exited = new Promise<void>((resolve) => worker.once('exit', () => resolve()));
  worker.kill('SIGTERM');
  await exited;
}

test('manages a guild registration and its Voicelet configuration', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Guild Administration' })).toBeVisible();
  await expect(page.getByText('No guilds are registered yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Register guild' }).click();
  await page.getByLabel('Discord guild ID *').fill(guildId);
  await page.getByRole('button', { name: 'Register guild' }).last().click();
  await expect(page.getByText(guildId)).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: guildId }).getByText('Unconfigured'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Add configuration' }).click();
  await page.getByLabel('Trigger voice channel ID *').fill(triggerId);
  await page.getByLabel('Temporary-room category ID *').fill(categoryId);
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await expect(page.getByText('Configured')).toBeVisible();
  await expect(page.getByText('Enabled')).toBeVisible();

  await page.getByRole('button', { name: 'View' }).click();
  await expect(page.getByText(triggerId)).toBeVisible();
  await expect(page.getByText(categoryId)).toBeVisible();
  await page.getByRole('dialog').getByText('Close', { exact: true }).click();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Trigger voice channel ID *').fill(updatedTriggerId);
  await page.getByRole('button', { name: 'Save configuration' }).click();
  await page.getByRole('switch', { name: `Enable Voicelet for ${guildId}` }).click();
  await expect(page.getByText('Disabled', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'View' }).click();
  await expect(page.getByText(updatedTriggerId)).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Disabled', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByText('Close', { exact: true }).click();
  const restarted = fork('dist/main.js', [], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '3001',
      GATEWAY_MODE: 'simulated',
      PERSISTENCE_PROVIDER: 'firestore',
      FIRESTORE_PROJECT_ID: 'voicelet-test',
      LOG_LEVEL: 'silent',
    },
    stdio: 'ignore',
  });
  try {
    await waitForReady(3001);
    await page.goto('http://127.0.0.1:3001/admin');
    await expect(page.getByText('Disabled', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'View' }).click();
    await expect(page.getByText(updatedTriggerId)).toBeVisible();
    await page.getByRole('dialog').getByText('Close', { exact: true }).click();
    await page.getByRole('switch', { name: `Enable Voicelet for ${guildId}` }).click();
    await expect(page.getByText('Enabled', { exact: true })).toBeVisible();
  } finally {
    await stop(restarted);
  }
  await page.goto('/admin');

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('It does not delete the Discord server')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText(guildId)).toBeVisible();

  await page.getByRole('button', { name: 'Register guild' }).click();
  await page.getByLabel('Discord guild ID *').fill(replacementGuildId);
  await page.getByRole('button', { name: 'Register guild' }).last().click();
  await expect(page.getByText(replacementGuildId)).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText('It does not delete the Discord server')).toBeVisible();
  const deletion = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' && response.url().endsWith(`/guilds/${guildId}`),
  );
  await page.getByRole('button', { name: 'Delete registration' }).click();
  const deletionResponse = await deletion;
  expect(deletionResponse.status()).toBe(204);
  await expect(page.getByText(guildId)).not.toBeVisible();
  await expect(page.getByText(replacementGuildId)).toBeVisible();

  await page.getByRole('button', { name: 'Register guild' }).click();
  await page.getByLabel('Discord guild ID *').fill(guildId);
  await page.getByRole('button', { name: 'Register guild' }).last().click();
  await expect(page.getByText(guildId)).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: guildId }).getByText('Unconfigured'),
  ).toBeVisible();
});
