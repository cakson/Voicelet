import type { ReactNode } from 'react';
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

function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        title={`More information about ${label}`}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-400 text-[10px] text-neutral-600 hover:border-neutral-700 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-64 rounded-md bg-neutral-900 p-2 text-xs font-normal leading-relaxed text-white shadow-lg group-focus-within:block group-hover:block"
      >
        {children}
      </span>
    </span>
  );
}

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
  const field = (
    name: 'triggerChannelId' | 'destinationCategoryId',
    label: string,
    help: string,
  ) => (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label htmlFor={name}>
          {label} <span className="text-red-600">*</span>
        </Label>
        <FieldHelp label={label}>{help}</FieldHelp>
      </div>
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
      {field(
        'triggerChannelId',
        'Trigger voice channel ID',
        'The Discord voice-channel ID for the lobby members join to create a temporary room.',
      )}
      {field(
        'destinationCategoryId',
        'Temporary-room category ID',
        'The Discord category ID where Voicelet creates temporary voice rooms.',
      )}
      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="inactivityTimeoutMinutes">Inactivity timeout (minutes)</Label>
          <FieldHelp label="Inactivity timeout">
            How long an empty temporary room remains before Voicelet deletes it.
          </FieldHelp>
        </div>
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
        <div className="flex items-center">
          <Label htmlFor="reconciliationIntervalMinutes">Reconciliation interval (minutes)</Label>
          <FieldHelp label="Reconciliation interval">
            How often Voicelet checks temporary rooms and corrects their lifecycle state.
          </FieldHelp>
        </div>
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
        <div className="flex items-center">
          <Label htmlFor="permanentChannelIds">Protected permanent channel IDs</Label>
          <FieldHelp label="Protected permanent channel IDs">
            One Discord channel ID per line. Do not use commas. These channels are never deleted by
            temporary-room cleanup.
          </FieldHelp>
        </div>
        <textarea
          id="permanentChannelIds"
          className="min-h-20 rounded-md border border-neutral-300 p-3 text-sm"
          placeholder={'123456789012345678\n234567890123456789'}
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
