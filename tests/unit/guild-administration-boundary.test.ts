import { expectTypeOf, it } from 'vitest';
import type {
  GuildConfigurationCreationRepository,
  GuildConfigurationMutationRepository,
  GuildDeletionRepository,
  GuildRegistrationRepository,
} from '../../src/ports/guild-administration-repository.js';
import type { EnabledGuildConfigRepository } from '../../src/ports/enabled-guild-config-repository.js';

it('keeps administration capabilities narrow and provider neutral', () => {
  expectTypeOf<keyof GuildRegistrationRepository>().toEqualTypeOf<
    'listGuilds' | 'getGuild' | 'registerGuild'
  >();
  expectTypeOf<keyof GuildConfigurationCreationRepository>().toEqualTypeOf<'createConfiguration'>();
  expectTypeOf<keyof GuildConfigurationMutationRepository>().toEqualTypeOf<
    'replaceConfiguration' | 'setConfigurationEnabled'
  >();
  expectTypeOf<keyof GuildDeletionRepository>().toEqualTypeOf<'deleteGuild'>();
  expectTypeOf<keyof EnabledGuildConfigRepository>().toEqualTypeOf<'getEnabled' | 'listEnabled'>();
});
