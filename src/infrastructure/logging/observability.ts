import pino, { type Logger } from 'pino';
import { Counter, Gauge, Registry } from 'prom-client';
import type { GatewayState, ObservationSink } from '../../ports/index.js';

export class Observability implements ObservationSink {
  readonly registry = new Registry();
  readonly gatewayReady = new Gauge({
    name: 'voicelet_gateway_ready',
    help: 'Gateway readiness state',
    registers: [this.registry],
  });
  readonly handled = new Counter({
    name: 'voicelet_voice_state_events_handled_total',
    help: 'Handled voice-state events',
    registers: [this.registry],
  });
  readonly rejected = new Counter({
    name: 'voicelet_voice_state_events_rejected_total',
    help: 'Rejected voice-state events',
    registers: [this.registry],
  });
  readonly reconnects = new Counter({
    name: 'voicelet_gateway_reconnects_total',
    help: 'Gateway reconnects',
    registers: [this.registry],
  });

  constructor(readonly logger: Logger) {}

  static create(level: string): Observability {
    return new Observability(pino({ level }));
  }

  record(
    event: 'voice_state_handled' | 'voice_state_rejected',
    details: Record<string, unknown>,
  ): void {
    if (event === 'voice_state_handled') this.handled.inc();
    else this.rejected.inc();
    this.logger.info(details, event);
  }

  setGatewayState(state: GatewayState): void {
    this.gatewayReady.set(state === 'ready' ? 1 : 0);
  }

  recordReconnect(): void {
    this.reconnects.inc();
    this.logger.warn({ state: 'reconnecting' }, 'gateway_reconnect_scheduled');
  }
}
