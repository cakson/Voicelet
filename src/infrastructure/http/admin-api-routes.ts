import type { FastifyInstance } from 'fastify';
import type { GuildAdministrationView } from '../../ports/guild-administration-repository.js';
import { GuildAdministrationService } from '../../application/guild-administration-service.js';
import { adminError } from './admin-error-response.js';
import {
  guildParamsSchema,
  registerGuildSchema,
  saveConfigurationSchema,
  setEnabledSchema,
} from './admin-api-schemas.js';

function detail(guild: GuildAdministrationView) {
  return { guildId: guild.guildId, configuration: guild.configuration };
}

function fields(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message]),
  );
}

export function registerAdminApiRoutes(
  app: FastifyInstance,
  service: GuildAdministrationService,
): void {
  app.get('/admin/api/guilds', async (_request, reply) => {
    const result = await service.listRegisteredGuilds();
    if (result.kind === 'unavailable') return adminError(reply, 503, 'service_unavailable');
    return {
      guilds: result.guilds.map((guild) => ({
        guildId: guild.guildId,
        configurationStatus: guild.configuration ? 'configured' : 'unconfigured',
        enabled: guild.configuration?.enabled ?? null,
      })),
    };
  });

  app.post('/admin/api/guilds', async (request, reply) => {
    const parsed = registerGuildSchema.safeParse(request.body);
    if (!parsed.success) return adminError(reply, 400, 'validation_error', fields(parsed.error));
    const result = await service.registerGuild(parsed.data);
    if (result.kind === 'registered') return reply.code(201).send(detail(result.guild));
    if (result.kind === 'duplicate') return adminError(reply, 409, 'duplicate_guild');
    if (result.kind === 'invalid') return adminError(reply, 400, 'validation_error');
    return adminError(reply, 503, 'service_unavailable');
  });

  app.get('/admin/api/guilds/:guildId', async (request, reply) => {
    const parsed = guildParamsSchema.safeParse(request.params);
    if (!parsed.success) return adminError(reply, 400, 'validation_error', fields(parsed.error));
    const result = await service.getRegisteredGuild(parsed.data.guildId);
    if (result.kind === 'found') return detail(result.guild);
    if (result.kind === 'not_found') return adminError(reply, 404, 'not_found');
    if (result.kind === 'invalid') return adminError(reply, 400, 'validation_error');
    return adminError(reply, 503, 'service_unavailable');
  });

  app.put('/admin/api/guilds/:guildId/configuration', async (request, reply) => {
    const params = guildParamsSchema.safeParse(request.params);
    const body = saveConfigurationSchema.safeParse(request.body);
    if (!params.success || !body.success) return adminError(reply, 400, 'validation_error');
    const result =
      body.data.expectedRevision === null
        ? await service.createConfiguration(params.data.guildId, body.data)
        : await service.replaceConfiguration(
            params.data.guildId,
            body.data,
            body.data.expectedRevision,
          );
    if (result.kind === 'saved')
      return reply.code(body.data.expectedRevision === null ? 201 : 200).send(detail(result.guild));
    if (result.kind === 'not_found') return adminError(reply, 404, 'not_found');
    if (result.kind === 'conflict') return adminError(reply, 409, 'conflict');
    if (result.kind === 'invalid') return adminError(reply, 400, 'validation_error');
    return adminError(reply, 503, 'service_unavailable');
  });

  app.patch('/admin/api/guilds/:guildId/configuration/enabled', async (request, reply) => {
    const params = guildParamsSchema.safeParse(request.params);
    const body = setEnabledSchema.safeParse(request.body);
    if (!params.success || !body.success) return adminError(reply, 400, 'validation_error');
    const result = await service.setConfigurationEnabled(
      params.data.guildId,
      body.data.enabled,
      body.data.expectedRevision,
    );
    if (result.kind === 'enabled' || result.kind === 'disabled') return detail(result.guild);
    if (result.kind === 'not_found') return adminError(reply, 404, 'not_found');
    if (result.kind === 'conflict') return adminError(reply, 409, 'conflict');
    if (result.kind === 'invalid') return adminError(reply, 400, 'validation_error');
    return adminError(reply, 503, 'service_unavailable');
  });

  app.delete('/admin/api/guilds/:guildId', async (request, reply) => {
    const params = guildParamsSchema.safeParse(request.params);
    if (!params.success) return adminError(reply, 400, 'validation_error', fields(params.error));
    const result = await service.deleteGuild(params.data.guildId);
    if (result.kind === 'deleted') return reply.code(204).send();
    if (result.kind === 'not_found') return adminError(reply, 404, 'not_found');
    if (result.kind === 'invalid') return adminError(reply, 400, 'validation_error');
    return adminError(reply, 503, 'service_unavailable');
  });
}
