import { afterEach, describe, expect, it } from 'vitest';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { GuildAdministrationService } from '../../src/application/guild-administration-service.js';
import { registerAdminApiRoutes } from '../../src/infrastructure/http/admin-api-routes.js';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

const apps: Array<ReturnType<typeof createOperationalServer>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('operational HTTP contract', () => {
  it('returns liveness, readiness, and metrics without sensitive data', async () => {
    const observability = Observability.create('silent');
    let state: 'connecting' | 'ready' = 'connecting';
    const app = createOperationalServer(() => state, observability);
    apps.push(app);
    expect((await app.inject('/livez')).statusCode).toBe(200);
    expect((await app.inject('/readyz')).statusCode).toBe(503);
    state = 'ready';
    expect((await app.inject('/readyz')).json()).toEqual({ status: 'ready', gateway: 'ready' });
    expect((await app.inject('/metrics')).body).toContain('voicelet_gateway_ready');
  });

  it('keeps liveness healthy while persistence readiness fails and recovers', async () => {
    const observability = Observability.create('silent');
    let ready = true;
    let persistence = true;
    const app = createOperationalServer(
      () => ({ gateway: ready ? 'ready' : 'connecting', persistence }),
      observability,
    );
    apps.push(app);
    expect((await app.inject('/readyz')).statusCode).toBe(200);
    persistence = false;
    expect((await app.inject('/livez')).statusCode).toBe(200);
    expect((await app.inject('/readyz')).statusCode).toBe(503);
    persistence = true;
    expect((await app.inject('/readyz')).statusCode).toBe(200);
    ready = false;
    expect((await app.inject('/readyz')).statusCode).toBe(503);
  });
  it('keeps operational endpoints independent from unavailable administration persistence', async () => {
    const observability = Observability.create('silent');
    const repository = new InMemoryGuildRepository();
    repository.unavailable = true;
    const app = createOperationalServer(() => 'ready', observability);
    registerAdminApiRoutes(app, new GuildAdministrationService(repository), observability);
    apps.push(app);
    expect((await app.inject('/admin/api/guilds')).statusCode).toBe(503);
    expect((await app.inject('/livez')).statusCode).toBe(200);
    expect((await app.inject('/readyz')).statusCode).toBe(200);
    expect((await app.inject('/metrics')).statusCode).toBe(200);
  });
});
