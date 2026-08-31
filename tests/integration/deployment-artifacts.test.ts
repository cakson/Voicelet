import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFile(path, 'utf8');

describe('container and deployment artifacts', () => {
  it('defines a production image with a secret-free build context', async () => {
    const [dockerfile, dockerignore] = await Promise.all([
      read('Dockerfile'),
      read('.dockerignore'),
    ]);
    expect(dockerfile).toContain('pnpm-lock.yaml');
    expect(dockerfile).toContain('pnpm install --frozen-lockfile');
    expect(dockerfile).toContain('dist/main.js');
    expect(dockerfile).toContain('USER voicelet');
    expect(dockerfile).toContain('/livez');
    for (const entry of ['.env*', '.git', 'node_modules', 'dist', 'coverage'])
      expect(dockerignore).toContain(entry);
  });

  it('publishes only quality-gated immutable main revisions', async () => {
    const workflow = await read('.github/workflows/publish-container.yml');
    expect(workflow).toContain('pull_request');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('pnpm check');
    expect(workflow).toContain('packages: write');
    expect(workflow).toContain('sha-${{ github.sha }}');
    expect(workflow).toContain('org.opencontainers.image.revision');
    expect(workflow).not.toMatch(/pull_request[\s\S]{0,180}docker\/push-action/);
    expect(workflow).not.toMatch(/uses:\s+[^@\n]+@(v|main|master)(?:\s|$)/);
  });

  it('requires explicit immutable deployment selection and readiness verification', async () => {
    const workflow = await read('.github/workflows/deploy-northflank.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('image_version:');
    expect(workflow).toContain('sha-[0-9a-f]{40}');
    expect(workflow).toContain('NORTHFLANK_API_TOKEN');
    expect(workflow).toContain('NORTHFLANK_READINESS_URL');
    expect(workflow).toContain('sha256:');
    expect(workflow).toContain('timeout');
    expect(workflow).toContain('/readyz');
    expect(workflow).not.toMatch(/image(?:_ref|Reference)?\s*=.*:latest/);
  });

  it('documents version discovery, rollback, and the runtime secret boundary', async () => {
    const [readme, deployment] = await Promise.all([read('README.md'), read('docs/deployment.md')]);
    for (const phrase of [
      'Docker',
      'GitHub Container Registry',
      'sha-',
      'rollback',
      'NORTHFLANK_API_TOKEN',
      'NORTHFLANK_READINESS_URL',
      'runtime configuration',
      'build-time',
    ]) {
      expect(`${readme}\n${deployment}`).toContain(phrase);
    }
    expect(`${readme}\n${deployment}`).not.toMatch(/DISCORD_TOKEN\s*[:=]\s*\S{20,}/);
    expect(`${readme}\n${deployment}`).not.toMatch(/NORTHFLANK_API_TOKEN\s*[:=]\s*\S{20,}/);
  });
});
