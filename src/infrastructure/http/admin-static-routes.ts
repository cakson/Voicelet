import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply } from 'fastify';

const root = path.resolve(fileURLToPath(new URL('../../../dist/admin', import.meta.url)));

export function registerAdminStaticRoutes(app: FastifyInstance): void {
  if (!existsSync(root)) return;
  app.register(fastifyStatic, {
    root: path.join(root, 'assets'),
    prefix: '/admin/assets/',
    wildcard: false,
    maxAge: '1y',
    immutable: true,
  });
  const sendIndex = async (_request: unknown, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store').type('text/html; charset=utf-8');
    return reply.send(await readFile(path.join(root, 'index.html'), 'utf8'));
  };
  app.get('/admin', sendIndex);
  app.get('/admin/', sendIndex);
  app.get('/admin/*', async (request, reply) => {
    const url = request.url.split('?')[0] ?? '';
    if (url.startsWith('/admin/assets/')) return reply.code(404).send({ error: 'not_found' });
    return sendIndex(request, reply);
  });
}
