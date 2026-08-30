import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('documentation', () => {
  it('links developers to every required local command', async () => {
    const readme = await readFile('README.md', 'utf8');
    for (const command of ['pnpm dev', 'pnpm check', 'pnpm build'])
      expect(readme).toContain(command);
  });
});
