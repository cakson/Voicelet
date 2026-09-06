import { expect, test } from '@playwright/test';
import { emulatorFirestore, resetGuildConfigEmulator } from '../support/firestore-emulator.js';

const guildId = (index: number) => `200000000000000${String(index).padStart(3, '0')}`;
const firestore = emulatorFirestore();

test.beforeEach(async () => {
  await resetGuildConfigEmulator(firestore);
});

test('renders a warm 100-row guild inventory within the loopback budget', async ({
  page,
  request,
}) => {
  for (let index = 0; index < 100; index += 1) {
    const response = await request.post('/admin/api/guilds', { data: { guildId: guildId(index) } });
    expect(response.status()).toBe(201);
  }

  const elapsed: number[] = [];
  for (let sample = 0; sample < 5; sample += 1) {
    const started = performance.now();
    await page.goto('/admin');
    await expect(page.getByText(guildId(99))).toBeVisible();
    elapsed.push(performance.now() - started);
  }
  const median = [...elapsed].sort((left, right) => left - right)[2]!;
  expect(median).toBeLessThan(2_000);

  const deletion = await request.delete(`/admin/api/guilds/${guildId(0)}`);
  expect(deletion.status()).toBe(204);
  await page.reload();
  await expect(page.getByText(guildId(0))).not.toBeVisible();
});
