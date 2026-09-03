import { describe, expect, it } from 'vitest';
import { GuildAdministrationService } from '../../src/application/guild-administration-service.js';
import { registerAdminApiRoutes } from '../../src/infrastructure/http/admin-api-routes.js';
import { registerAdminStaticRoutes } from '../../src/infrastructure/http/admin-static-routes.js';
import { createOperationalServer } from '../../src/infrastructure/http/operational-server.js';
import { Observability } from '../../src/infrastructure/logging/observability.js';
import { InMemoryGuildRepository } from '../../src/infrastructure/memory/in-memory-guild-repository.js';

describe('administration static delivery', () => {
  it('serves direct admin loads without intercepting API or health routes', async () => {
    const app = createOperationalServer(() => 'ready', Observability.create('silent'));
    registerAdminApiRoutes(app, new GuildAdministrationService(new InMemoryGuildRepository()));
    registerAdminStaticRoutes(app);
    await app.ready();
    await expect(app.inject('/admin')).resolves.toMatchObject({ statusCode: 200 });
    await expect(app.inject('/admin/deep-link')).resolves.toMatchObject({ statusCode: 200 });
    await expect(app.inject('/admin/api/guilds')).resolves.toMatchObject({ statusCode: 200 });
    await expect(app.inject('/livez')).resolves.toMatchObject({ statusCode: 200 });
    await app.close();
  });
});
