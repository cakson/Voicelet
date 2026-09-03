import { expect, test } from '@playwright/test';

const guildId = '100000000000000101';
const triggerId = '100000000000000102';
const updatedTriggerId = '100000000000000103';
const categoryId = '100000000000000104';

test('manages a guild registration and its Voicelet configuration', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Guild Administration' })).toBeVisible();
  await expect(page.getByText('No guilds are registered yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Register guild' }).click();
  await page.getByLabel('Discord guild ID *').fill(guildId);
  await page.getByRole('button', { name: 'Register guild' }).last().click();
  await expect(page.getByText(guildId)).toBeVisible();
  await expect(page.getByText('Unconfigured')).toBeVisible();

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
  await page.getByRole('switch', { name: `Enable Voicelet for ${guildId}` }).click();
  await expect(page.getByText('Enabled', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('It does not delete the Discord server')).toBeVisible();
  const deletion = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' && response.url().endsWith(`/guilds/${guildId}`),
  );
  await page.getByRole('button', { name: 'Delete registration' }).click();
  const deletionResponse = await deletion;
  expect(deletionResponse.status()).toBe(204);
  await expect(page.getByText('No guilds are registered yet.')).toBeVisible();
});
