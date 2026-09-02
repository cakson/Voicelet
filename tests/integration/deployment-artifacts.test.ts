import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
    expect(dockerfile).toMatch(
      /^FROM node:24\.20\.0-bookworm-slim@sha256:[0-9a-f]{64} AS (build|runtime)$/gm,
    );
    expect(dockerfile).toContain(
      'node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e',
    );
    expect([...dockerfile.matchAll(/^FROM /gm)]).toHaveLength(2);
    for (const entry of ['.env*', '.git', 'node_modules', 'dist', 'coverage'])
      expect(dockerignore).toContain(entry);
  });

  it('publishes only quality-gated immutable main revisions', async () => {
    const workflow = await read('.github/workflows/publish-container.yml');
    expect(workflow).toContain('pull_request');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('pnpm check');
    expect(workflow).toContain('--store-dir /tmp/pnpm-store');
    expect(workflow).toContain('--env CI=true');
    expect(workflow).toContain('packages: write');
    expect(workflow).toContain('sha-${{ github.sha }}');
    expect(workflow).toContain('org.opencontainers.image.revision');
    expect(workflow).not.toMatch(/pull_request[\s\S]{0,180}docker\/push-action/);
    expect(workflow).not.toMatch(/uses:\s+[^@\n]+@(v|main|master)(?:\s|$)/);
  });

  it('pins every third-party workflow action to an immutable commit', async () => {
    const { readdir } = await import('node:fs/promises');
    const workflowFiles = await readdir('.github/workflows');
    for (const file of workflowFiles.filter(
      (entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'),
    )) {
      const workflow = await read(`.github/workflows/${file}`);
      for (const match of workflow.matchAll(/^\s*-?\s*uses:\s*([^@\s]+)@([^\s#]+)/gm)) {
        expect(match[2], `${file} action ${match[1]}`).toMatch(/^[0-9a-f]{40}$/);
      }
    }
  });

  it('grants Gitleaks only the pull-request read access it requires', async () => {
    const workflow = await read('.github/workflows/ci.yml');
    expect(workflow).toContain('pull-requests: read');
    expect(workflow).not.toContain('pull-requests: write');
  });

  it('caches Firebase emulator downloads using the pinned tooling lockfile', async () => {
    const workflow = await read('.github/workflows/ci.yml');
    expect(workflow).toContain('actions/cache@');
    expect(workflow).toContain('~/.cache/firebase/emulators');
    expect(workflow).toContain("hashFiles('pnpm-lock.yaml')");
  });

  it('does not retain a repository-managed provider deployment workflow', () => {
    expect(existsSync('.github/workflows/deploy-northflank.yml')).toBe(false);
  });

  it('documents a provider-neutral GHCR handoff and transition boundary', async () => {
    const activeDocs = await Promise.all([
      read('README.md'),
      read('docs/deployment.md'),
      read('docs/architecture.md'),
      read('docs/testing.md'),
    ]);
    const content = activeDocs.join('\n');
    for (const phrase of [
      'GitHub Container Registry',
      'sha-',
      'runtime configuration',
      'external',
      'transition prerequisite',
    ]) {
      expect(content).toContain(phrase);
    }
    expect(content).not.toMatch(/Northflank|Deploy Northflank|NORTHFLANK_/i);
    expect(content).not.toMatch(/DISCORD_TOKEN\s*[:=]\s*\S{20,}/);
    expect(content).not.toMatch(/GITHUB_TOKEN\s*[:=]\s*\S{20,}/);
  });
});
