import { afterEach, describe, expect, it } from 'vitest';
import { GuildAdministrationService } from '../../src/application/guild-administration-service.js';
import { registerAdminApiRoutes } from '../../src/infrastructure/http/admin-api-routes.js';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

const guildId = '123456789012345678';
const configuration = {
  triggerChannelId: '223456789012345678',
  destinationCategoryId: '323456789012345678',
};

describe('administration HTTP API', () => {
  const apps: ReturnType<typeof createOperationalServer>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });
  function app() {
    const server = createOperationalServer(() => 'ready', Observability.create('silent'));
    registerAdminApiRoutes(server, new GuildAdministrationService(new InMemoryGuildRepository()));
    apps.push(server);
    return server;
  }
  it('registers, lists, configures, toggles, and deletes a guild', async () => {
    const server = app();
    await expect(
      server.inject({ method: 'POST', url: '/admin/api/guilds', payload: { guildId } }),
    ).resolves.toMatchObject({ statusCode: 201 });
    await expect(server.inject('/admin/api/guilds')).resolves.toMatchObject({
      statusCode: 200,
      json: expect.any(Function),
    });
    const created = await server.inject({
      method: 'PUT',
      url: `/admin/api/guilds/${guildId}/configuration`,
      payload: { ...configuration, expectedRevision: null },
    });
    expect(created.statusCode).toBe(201);
    const revision = created.json().configuration.revision;
    await expect(
      server.inject({
        method: 'PATCH',
        url: `/admin/api/guilds/${guildId}/configuration/enabled`,
        payload: { enabled: false, expectedRevision: revision },
      }),
    ).resolves.toMatchObject({ statusCode: 200 });
    await expect(
      server.inject({ method: 'DELETE', url: `/admin/api/guilds/${guildId}` }),
    ).resolves.toMatchObject({ statusCode: 204 });
  });
  it('returns safe validation and duplicate errors', async () => {
    const server = app();
    await expect(
      server.inject({ method: 'POST', url: '/admin/api/guilds', payload: { guildId: 'bad' } }),
    ).resolves.toMatchObject({ statusCode: 400 });
    await server.inject({ method: 'POST', url: '/admin/api/guilds', payload: { guildId } });
    const duplicate = await server.inject({
      method: 'POST',
      url: '/admin/api/guilds',
      payload: { guildId },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error).toEqual(expect.objectContaining({ code: 'duplicate_guild' }));
  });
});
