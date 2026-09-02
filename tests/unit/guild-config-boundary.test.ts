import { expectTypeOf, it } from 'vitest';
import { TemporaryRoomManager } from '../../src/application/manage-temporary-room.js';
import { TemporaryRoomReconciler } from '../../src/application/reconcile-temporary-rooms.js';
import { DiscordGatewayEventSource } from '../../src/infrastructure/discord/discord-gateway-event-source.js';
import { InMemoryGuildConfigRepository } from '../../src/infrastructure/memory/in-memory-guild-config-repository.js';

type RuntimeGuildConfigMap = Map<
  string,
  { triggerChannelId: string; destinationCategoryId: string }
>;

it('does not accept runtime maps as guild configuration sources', () => {
  expectTypeOf<RuntimeGuildConfigMap>().not.toMatchTypeOf<
    ConstructorParameters<typeof TemporaryRoomManager>[0]
  >();
  expectTypeOf<RuntimeGuildConfigMap>().not.toMatchTypeOf<
    ConstructorParameters<typeof TemporaryRoomReconciler>[0]
  >();
  expectTypeOf<RuntimeGuildConfigMap>().not.toMatchTypeOf<
    ConstructorParameters<typeof DiscordGatewayEventSource>[4]
  >();
  expectTypeOf<RuntimeGuildConfigMap>().not.toMatchTypeOf<
    Exclude<ConstructorParameters<typeof InMemoryGuildConfigRepository>[0], undefined>
  >();
});
