import { describe, expect, it } from 'vitest';
import { DiscordJsClient } from '../../src/infrastructure/discord/discord-client-factory.js';

describe('DiscordJsClient room lifecycle boundary', () => {
  it('does not treat an uncached guild as a missing room or successful deletion', async () => {
    const client = new DiscordJsClient({
      guilds: { cache: { get: () => undefined } },
    } as never);

    await expect(client.roomState('guild', 'room')).resolves.toBe('unavailable');
    await expect(client.deleteRoom('guild', 'room')).resolves.toBe('failed');
  });
});
