import type {
  Clock,
  DiscordClient,
  DiscordClientFactory,
  GatewayState,
} from '../../ports/index.js';
import { normalizeVoiceState } from '../../domain/normalize-voice-state.js';
import { TemporaryRoomManager } from '../../application/manage-temporary-room.js';
import type { TemporaryRoomConfig } from '../../domain/voice-state.js';
import type { Observability } from '../logging/observability.js';

export class DiscordGatewayEventSource {
  private state: GatewayState = 'starting';
  private readonly client: DiscordClient;

  constructor(
    private readonly factory: DiscordClientFactory,
    private readonly token: string,
    private readonly clock: Clock,
    private readonly observability: Observability,
    configurations: Map<string, TemporaryRoomConfig> = new Map(),
  ) {
    this.client = factory.create();
    this.rooms = new TemporaryRoomManager(configurations, this.client, (event) =>
      this.observability.recordTemporaryRoom(event),
    );
  }
  private readonly rooms: TemporaryRoomManager;

  get readiness(): GatewayState {
    return this.state;
  }

  private setState(state: GatewayState): void {
    this.state = state;
    this.observability.setGatewayState(state);
  }

  async start(): Promise<void> {
    this.setState('connecting');
    this.client.onReady(() => {
      this.setState('ready');
    });
    this.client.onVoiceState((event) => {
      const normalized = normalizeVoiceState(event, this.clock);
      if (!normalized) {
        this.observability.record('voice_state_rejected', {
          eventType: 'voice_state',
          outcome: 'rejected',
        });
        return;
      }
      this.observability.record('voice_state_handled', {
        eventType: 'voice_state',
        outcome: 'handled',
      });
      void this.rooms.handle(normalized);
    });
    this.client.onDisconnect(() => {
      this.setState('disconnected');
    });
    this.client.onReconnect(() => {
      this.setState('reconnecting');
      this.observability.recordReconnect();
    });
    this.client.onError(() => {
      this.setState('disconnected');
      this.observability.recordGatewayFailure();
    });
    try {
      await this.client.login(this.token);
    } catch {
      this.setState('disconnected');
      this.observability.recordGatewayFailure();
    }
  }

  stop(): void {
    this.setState('stopped');
    this.client.destroy();
  }
}
