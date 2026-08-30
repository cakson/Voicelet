import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('agent instructions', () => {
  it('requires validation before an agent reports completion', async () => {
    const instructions = await readFile('AGENTS.md', 'utf8');
    expect(instructions).toContain('pnpm check');
  });
});
