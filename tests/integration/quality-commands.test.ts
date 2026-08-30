import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execute = promisify(execFile);

describe('quality commands', () => {
  it('rejects representative defects for every required quality category', async () => {
    const fixture = (name: string) => `tests/support/quality-fixtures/${name}`;
    const failures = await Promise.allSettled([
      execute('pnpm', [
        'exec',
        'prettier',
        '--ignore-path',
        '/dev/null',
        '--check',
        fixture('format-error.ts'),
      ]),
      execute('pnpm', ['exec', 'eslint', '--no-ignore', fixture('lint-error.ts')]),
      execute('pnpm', ['exec', 'tsc', '--noEmit', '--skipLibCheck', fixture('type-error.ts')]),
      execute('pnpm', [
        'exec',
        'vitest',
        'run',
        '--config',
        fixture('vitest.config.ts'),
        fixture('test-failure.test.ts'),
      ]),
      execute('pnpm', ['exec', 'tsc', '--noEmit', '--skipLibCheck', fixture('build-error.ts')]),
    ]);
    expect(failures.map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
      'rejected',
      'rejected',
      'rejected',
    ]);
  });
});
