import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { guildAdminApi } from '@/features/guilds/api/guild-admin-api';
import { DeleteGuildDialog } from '@/features/guilds/components/delete-guild-dialog';
import { GuildConfigDialog } from '@/features/guilds/components/guild-config-dialog';
import { GuildList } from '@/features/guilds/components/guild-list';
import { RegisterGuildDialog } from '@/features/guilds/components/register-guild-dialog';
import type { GuildDetail, GuildSummary } from '@/features/guilds/types';

export function App() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [mode, setMode] = useState<'create' | 'view' | 'edit' | null>(null);
  const [deleteGuildId, setDeleteGuildId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setGuilds(await guildAdminApi.list());
      setListError(undefined);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Voicelet could not load guilds.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openConfiguration = async (guildId: string, nextMode: 'create' | 'view' | 'edit') => {
    try {
      setDetail(await guildAdminApi.get(guildId));
      setMode(nextMode);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Voicelet could not load this guild.');
    }
  };
  const toggle = async (guildId: string, enabled: boolean) => {
    try {
      const current = await guildAdminApi.get(guildId);
      if (!current.configuration) return;
      await guildAdminApi.setEnabled(guildId, enabled, current.configuration.revision);
      await refresh();
      setMessage(`Configuration ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Voicelet could not update this configuration.',
      );
      await refresh();
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guild Administration</h1>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Register Discord guilds and manage the Voicelet settings they use.
          </p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>Register guild</Button>
      </div>
      {message && (
        <Alert className="mb-4" aria-live="polite">
          {message}
        </Alert>
      )}
      <GuildList
        guilds={guilds}
        loading={loading}
        error={listError}
        onAddConfiguration={(id) => void openConfiguration(id, 'create')}
        onView={(id) => void openConfiguration(id, 'view')}
        onEdit={(id) => void openConfiguration(id, 'edit')}
        onDelete={setDeleteGuildId}
        onToggle={(id, enabled) => void toggle(id, enabled)}
      />
      <RegisterGuildDialog open={registerOpen} onOpenChange={setRegisterOpen} onSaved={refresh} />
      <GuildConfigDialog
        guildId={detail?.guildId ?? null}
        configuration={detail?.configuration ?? null}
        mode={mode}
        onClose={() => {
          setMode(null);
          setDetail(null);
        }}
        onSaved={refresh}
      />
      <DeleteGuildDialog
        guildId={deleteGuildId}
        onClose={() => setDeleteGuildId(null)}
        onDeleted={refresh}
        onError={async (error) => {
          setMessage(error);
          await refresh();
        }}
      />
    </main>
  );
}
