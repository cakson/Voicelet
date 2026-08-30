import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execute = promisify(execFile);

describe('quality commands', () => {
  it('rejects representative defects for every required quality category', async () => {
    const fixture = (name: string) => `tests/support/quality-fixtures/${name}.fixture`;
    const lintFixture = join(process.cwd(), 'tests', '.quality-lint-error.ts');
    await writeFile(lintFixture, 'const lintError = ;\n', 'utf8');
    const failures = await Promise.allSettled([
      execute('pnpm', ['exec', 'prettier', '--parser', 'typescript', '--check', fixture('format')]),
      execute('pnpm', ['exec', 'eslint', '--config', 'eslint.config.mjs', lintFixture]),
      execute('pnpm', ['exec', 'tsc', '--noEmit', fixture('type')]),
      execute('pnpm', ['exec', 'vitest', 'run', fixture('test')]),
      execute('pnpm', ['exec', 'tsc', '--noEmit', fixture('build')]),
    ]);
    await rm(lintFixture, { force: true });
    expect(failures.map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
      'rejected',
      'rejected',
      'rejected',
    ]);
  });
});
