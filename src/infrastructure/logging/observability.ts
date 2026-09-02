import pino, { type Logger } from 'pino';
import { Counter, Gauge, Registry } from 'prom-client';
import type {
  GatewayState,
  ObservationSink,
  ReconciliationObservation,
  TemporaryRoomObservation,
} from '../../ports/index.js';

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
  readonly gatewayFailures = new Counter({
    name: 'voicelet_gateway_failures_total',
    help: 'Gateway failures recorded without provider error details',
    registers: [this.registry],
  });
  readonly roomOperations = new Counter({
    name: 'voicelet_temporary_room_operations_total',
    help: 'Temporary room operation outcomes',
    labelNames: ['outcome'],
    registers: [this.registry],
  });
  readonly reconciliationOperations = new Counter({
    name: 'voicelet_room_reconciliation_operations_total',
    help: 'Room reconciliation outcomes without Discord identifiers',
    labelNames: ['outcome'],
    registers: [this.registry],
  });
  readonly persistenceReady = new Gauge({
    name: 'voicelet_persistence_ready',
    help: 'Whether guild configuration persistence is available',
    registers: [this.registry],
  });
  readonly configurationOperations = new Counter({
    name: 'voicelet_guild_configuration_operations_total',
    help: 'Guild configuration outcomes without identifiers or records',
    labelNames: ['outcome'],
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
  setPersistenceReady(ready: boolean): void {
    this.persistenceReady.set(ready ? 1 : 0);
  }
  recordConfiguration(outcome: string): void {
    const allowed = ['found', 'not_found', 'invalid', 'unavailable', 'saved', 'list'];
    const normalized = allowed.includes(outcome) ? outcome : 'unavailable';
    this.configurationOperations.inc({ outcome: normalized });
    this.setPersistenceReady(normalized !== 'unavailable');
    if (normalized === 'unavailable')
      this.logger.error({ failureClass: 'persistence' }, 'persistence_failure');
  }

  recordReconnect(): void {
    this.reconnects.inc();
    this.logger.warn({ state: 'reconnecting' }, 'gateway_reconnect_scheduled');
  }

  recordGatewayFailure(): void {
    this.gatewayFailures.inc();
    this.logger.error({ failureClass: 'gateway' }, 'gateway_failure');
  }
  recordTemporaryRoom(event: TemporaryRoomObservation): void {
    this.roomOperations.inc({ outcome: event.replace('temporary_room_', '') });
    this.logger.info({ outcome: event.replace('temporary_room_', '') }, 'temporary_room_operation');
  }
  recordReconciliation(event: ReconciliationObservation): void {
    const outcome = event.replace('reconciliation_', '');
    this.reconciliationOperations.inc({ outcome });
    this.logger.info({ outcome }, 'room_reconciliation_operation');
  }
}
