import Fastify, { type FastifyInstance } from 'fastify';
import type { GatewayState } from '../../ports/index.js';
import type { Observability } from '../logging/observability.js';

export function createOperationalServer(
  readiness: () => GatewayState | { gateway: GatewayState; persistence: boolean },
  observability: Observability,
): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get('/livez', async () => ({ status: 'live' }));
  app.get('/readyz', async (_request, reply) => {
    const result = readiness();
    const state = typeof result === 'string' ? result : result.gateway;
    const persistence = typeof result === 'string' ? true : result.persistence;
    if (state === 'ready' && persistence) return { status: 'ready', gateway: state };
    return reply.code(503).send({ status: 'not_ready', gateway: state, persistence });
  });
  app.get('/metrics', async (_request, reply) => {
    reply.header('content-type', observability.registry.contentType);
    return observability.registry.metrics();
  });
  return app;
}
