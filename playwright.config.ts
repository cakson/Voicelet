import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /admin-.*\.spec\.ts/,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm build && cross-env GATEWAY_MODE=simulated node dist/main.js',
    url: 'http://127.0.0.1:3000/livez',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
