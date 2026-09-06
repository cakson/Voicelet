import { describe, expect, it } from 'vitest';
import { GuildAdministrationService } from '../../src/application/guild-administration-service.js';
import { registerAdminApiRoutes } from '../../src/infrastructure/http/admin-api-routes.js';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

describe('administration API security boundary', () => {
  it('maps persistence failures to a safe response without provider details', async () => {
    const repository = new InMemoryGuildRepository();
    repository.unavailable = true;
    const app = createOperationalServer(() => 'ready', Observability.create('silent'));
    registerAdminApiRoutes(app, new GuildAdministrationService(repository));
    const response = await app.inject('/admin/api/guilds');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'service_unavailable',
        message: 'Voicelet could not save this change. Try again shortly.',
      },
    });
    expect(response.body).not.toContain('Firestore');
    expect(response.body).not.toContain('credential');
    await app.close();
  });
});
