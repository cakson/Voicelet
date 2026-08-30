import { afterEach, describe, expect, it } from 'vitest';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';

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
});
