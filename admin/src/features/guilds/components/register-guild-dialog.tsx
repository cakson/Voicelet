import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { guildAdminApi } from '../api/guild-admin-api';
import { validateConfiguration, validateSnowflake } from '../validation';
import { defaultConfiguration, GuildConfigForm } from './guild-config-form';

export function RegisterGuildDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [guildId, setGuildId] = useState('');
  const [configure, setConfigure] = useState(false);
  const [configuration, setConfiguration] = useState(defaultConfiguration);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const idError = validateSnowflake(guildId);
    const configurationErrors = configure ? validateConfiguration(configuration) : {};
    if (idError || Object.keys(configurationErrors).length) {
      setMessage(idError ?? 'Correct the configuration values before registering.');
      return;
    }
    setPending(true);
    setMessage(undefined);
    try {
      await guildAdminApi.register(guildId, configure ? configuration : undefined);
      await onSaved();
      onOpenChange(false);
      setGuildId('');
      setConfigure(false);
      setConfiguration(defaultConfiguration);
    } catch (error) {
      await onSaved();
      setMessage(
        error instanceof Error ? error.message : 'Voicelet could not register this guild.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register guild</DialogTitle>
          <DialogDescription>
            Register a Discord guild now. You may configure Voicelet immediately or leave it
            unconfigured.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="guildId">
              Discord guild ID <span className="text-red-600">*</span>
            </Label>
            <Input
              id="guildId"
              value={guildId}
              onChange={(event) => setGuildId(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={configure}
              onChange={(event) => setConfigure(event.target.checked)}
            />{' '}
            Configure Voicelet now
          </label>
          {configure && <GuildConfigForm value={configuration} onChange={setConfiguration} />}
          {message && <Alert className="border-red-200 text-red-800">{message}</Alert>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Registering…' : 'Register guild'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
