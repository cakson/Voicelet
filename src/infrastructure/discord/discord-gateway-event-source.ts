import type {
  Clock,
  DiscordClient,
  DiscordClientFactory,
  GatewayState,
} from '../../ports/index.js';
import { handleVoiceState } from '../../application/handle-voice-state.js';
import type { Observability } from '../logging/observability.js';

export class DiscordGatewayEventSource {
  private state: GatewayState = 'starting';
  private readonly client: DiscordClient;

  constructor(
    private readonly factory: DiscordClientFactory,
    private readonly token: string,
    private readonly clock: Clock,
    private readonly observability: Observability,
  ) {
    this.client = factory.create();
  }

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
      handleVoiceState(event, this.clock, this.observability);
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
