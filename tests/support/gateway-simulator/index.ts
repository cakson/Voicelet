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

export function moveRoomOutsideCategory(
  client: SimulatedDiscordClient,
  guildId: string,
  roomId: string,
): void {
  client.moveRoom(guildId, roomId);
}

export function failNextOwnerAllowance(client: SimulatedDiscordClient): void {
  client.failNextOwnerAllowance = true;
}

export function ownerCanManageRoom(
  client: SimulatedDiscordClient,
  roomId: string,
  ownerId: string,
): boolean {
  return client.canManageRoom(roomId, ownerId);
}
