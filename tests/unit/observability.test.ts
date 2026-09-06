import { describe, expect, it } from 'vitest';
import { Observability } from '../../src/infrastructure/logging/observability.js';

describe('administration observability', () => {
  it('records bounded operation labels without identifiers or submitted values', async () => {
    const observability = Observability.create('silent');
    observability.recordAdministration('register', 'success');
    observability.recordAdministration('100000000000000001', 'trigger-channel');
    const metrics = await observability.registry.metrics();
    expect(metrics).toContain(
      'voicelet_guild_administration_operations_total{operation="register",outcome="success"} 1',
    );
    expect(metrics).toContain(
      'voicelet_guild_administration_operations_total{operation="list",outcome="unavailable"} 1',
    );
    expect(metrics).not.toContain('100000000000000001');
    expect(metrics).not.toContain('trigger-channel');
  });
});
