import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': path.resolve(root, 'admin/src') } },
  test: {
    projects: [
      { test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
        },
      },
      { test: { name: 'e2e', include: ['tests/e2e/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias: { '@': path.resolve(root, 'admin/src') } },
        test: {
          name: 'admin',
          include: ['tests/unit/admin/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['admin/src/test/setup.ts'],
        },
      },
    ],
    coverage: { provider: 'v8', reporter: ['text', 'json-summary'] },
  },
});
