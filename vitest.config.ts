import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          // Firestore emulator suites share a disposable datastore and reset it after each test.
          fileParallelism: false,
        },
      },
      { test: { name: 'e2e', include: ['tests/e2e/**/*.test.ts'], environment: 'node' } },
    ],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
});
