import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { guildAdminApi } from '../api/guild-admin-api';
import type { ConfigurationInput, GuildConfiguration } from '../types';
import { validateConfiguration } from '../validation';
import { defaultConfiguration, GuildConfigForm } from './guild-config-form';
import { GuildConfigView } from './guild-config-view';

type Mode = 'create' | 'view' | 'edit';

export function GuildConfigDialog({
  guildId,
  configuration,
  mode,
  onClose,
  onSaved,
}: {
  guildId: string | null;
  configuration: GuildConfiguration | null;
  mode: Mode | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState<ConfigurationInput>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode === 'create') {
      setValue(defaultConfiguration);
      return;
    }
    if (!configuration) return;
    setValue({
      triggerChannelId: configuration.triggerChannelId,
      destinationCategoryId: configuration.destinationCategoryId,
      inactivityTimeoutMinutes: configuration.inactivityTimeoutMinutes,
      reconciliationIntervalMinutes: configuration.reconciliationIntervalMinutes,
      permanentChannelIds: configuration.permanentChannelIds,
      enabled: configuration.enabled,
    });
  }, [configuration, mode]);

  if (!guildId || !mode) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value) return;
    if (Object.keys(validateConfiguration(value)).length) {
      setMessage('Correct the configuration values before saving.');
      return;
    }
    setPending(true);
    setMessage(undefined);
    try {
      await guildAdminApi.save(
        guildId,
        value,
        mode === 'create' ? null : (configuration?.revision ?? null),
      );
      await onSaved();
      onClose();
    } catch (error) {
      await onSaved();
      setMessage(
        error instanceof Error ? error.message : 'Voicelet could not save this configuration.',
      );
    } finally {
      setPending(false);
    }
  };
  const title =
    mode === 'create'
      ? 'Add configuration'
      : mode === 'edit'
        ? 'Edit configuration'
        : 'Voicelet configuration';
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'view'
              ? 'These values are currently persisted and used by Voicelet.'
              : 'Fields marked required must contain Discord identifiers.'}
          </DialogDescription>
        </DialogHeader>
        {mode === 'view' && configuration ? (
          <>
            <GuildConfigView configuration={configuration} />
            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <form className="grid gap-4" onSubmit={submit}>
            {value && (
              <GuildConfigForm value={value} onChange={setValue} showEnabled={mode === 'create'} />
            )}
            {message && <Alert className="border-red-200 text-red-800">{message}</Alert>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save configuration'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
