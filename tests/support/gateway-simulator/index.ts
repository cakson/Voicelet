export {
  SimulatedDiscordClient,
  SimulatedDiscordClientFactory,
} from '../../../src/infrastructure/discord/simulated-client-factory.js';

import { SimulatedDiscordClient } from '../../../src/infrastructure/discord/simulated-client-factory.js';

export function seedCategoryRoom(
  client: SimulatedDiscordClient,
  guildId: string,
  roomId: string,
  categoryId: string,
  occupied = false,
): void {
  client.seedRoom(guildId, roomId, categoryId);
  client.setRoomOccupied(guildId, roomId, occupied);
}
