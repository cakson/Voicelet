import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('quality commands', () => {
  it('defines the CI-equivalent aggregate check', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.check).toContain('format:check');
    expect(pkg.scripts.check).toContain('lint');
    expect(pkg.scripts.check).toContain('typecheck');
    expect(pkg.scripts.check).toContain('test');
    expect(pkg.scripts.check).toContain('build');
  });
});
