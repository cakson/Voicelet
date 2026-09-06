import { Badge } from '@/components/ui/badge';
import type { GuildConfiguration } from '../types';

export function GuildConfigView({ configuration }: { configuration: GuildConfiguration }) {
  const values = [
    ['Trigger voice channel', configuration.triggerChannelId],
    ['Temporary-room category', configuration.destinationCategoryId],
    ['Inactivity timeout', `${configuration.inactivityTimeoutMinutes} minutes`],
    ['Reconciliation interval', `${configuration.reconciliationIntervalMinutes} minutes`],
    [
      'Protected channels',
      configuration.permanentChannelIds.length
        ? configuration.permanentChannelIds.join(', ')
        : 'None',
    ],
  ];
  return (
    <div className="grid gap-3">
      {values.map(([label, value]) => (
        <div key={label} className="grid gap-1">
          <dt className="text-sm font-medium">{label}</dt>
          <dd className="break-all text-sm text-neutral-600">{value}</dd>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">State</span>
        <Badge variant={configuration.enabled ? 'success' : 'destructive'}>
          {configuration.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>
    </div>
  );
}
