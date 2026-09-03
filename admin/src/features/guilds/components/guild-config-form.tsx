import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ConfigurationInput } from '../types';

export const defaultConfiguration: ConfigurationInput = {
  triggerChannelId: '',
  destinationCategoryId: '',
  inactivityTimeoutMinutes: 60,
  reconciliationIntervalMinutes: 15,
  permanentChannelIds: [],
  enabled: true,
};

export function GuildConfigForm({
  value,
  onChange,
  errors,
  showEnabled = true,
}: {
  value: ConfigurationInput;
  onChange: (value: ConfigurationInput) => void;
  errors?: Record<string, string>;
  showEnabled?: boolean;
}) {
  const change = <K extends keyof ConfigurationInput>(field: K, next: ConfigurationInput[K]) =>
    onChange({ ...value, [field]: next });
  const field = (name: 'triggerChannelId' | 'destinationCategoryId', label: string) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label} <span className="text-red-600">*</span>
      </Label>
      <Input
        id={name}
        value={value[name]}
        onChange={(event) => change(name, event.target.value)}
        aria-invalid={Boolean(errors?.[name])}
      />
      {errors?.[name] && <p className="text-sm text-red-700">{errors[name]}</p>}
    </div>
  );
  return (
    <div className="grid gap-4">
      {field('triggerChannelId', 'Trigger voice channel ID')}
      {field('destinationCategoryId', 'Temporary-room category ID')}
      <div className="grid gap-2">
        <Label htmlFor="inactivityTimeoutMinutes">Inactivity timeout (minutes)</Label>
        <Input
          id="inactivityTimeoutMinutes"
          type="number"
          min="1"
          max="1440"
          value={value.inactivityTimeoutMinutes}
          onChange={(event) => change('inactivityTimeoutMinutes', Number(event.target.value))}
        />
        {errors?.inactivityTimeoutMinutes && (
          <p className="text-sm text-red-700">{errors.inactivityTimeoutMinutes}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reconciliationIntervalMinutes">Reconciliation interval (minutes)</Label>
        <Input
          id="reconciliationIntervalMinutes"
          type="number"
          min="1"
          max="1440"
          value={value.reconciliationIntervalMinutes}
          onChange={(event) => change('reconciliationIntervalMinutes', Number(event.target.value))}
        />
        {errors?.reconciliationIntervalMinutes && (
          <p className="text-sm text-red-700">{errors.reconciliationIntervalMinutes}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="permanentChannelIds">Protected permanent channel IDs</Label>
        <textarea
          id="permanentChannelIds"
          className="min-h-20 rounded-md border border-neutral-300 p-3 text-sm"
          value={value.permanentChannelIds.join('\n')}
          onChange={(event) =>
            change(
              'permanentChannelIds',
              event.target.value
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean),
            )
          }
        />
        {errors?.permanentChannelIds && (
          <p className="text-sm text-red-700">{errors.permanentChannelIds}</p>
        )}
      </div>
      {showEnabled && (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="configurationEnabled">Enable Voicelet immediately</Label>
            <p className="text-sm text-neutral-600">
              Disabled configurations remain saved and editable.
            </p>
          </div>
          <Switch
            id="configurationEnabled"
            checked={value.enabled}
            onCheckedChange={(enabled) => change('enabled', enabled)}
          />
        </div>
      )}
    </div>
  );
}
