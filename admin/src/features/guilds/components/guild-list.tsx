import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GuildSummary } from '../types';

export function GuildList({
  guilds,
  loading,
  onAddConfiguration,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: {
  guilds: GuildSummary[];
  loading: boolean;
  onAddConfiguration: (guildId: string) => void;
  onView: (guildId: string) => void;
  onEdit: (guildId: string) => void;
  onDelete: (guildId: string) => void;
  onToggle: (guildId: string, enabled: boolean) => void;
}) {
  if (loading)
    return (
      <div className="grid gap-2" aria-label="Loading guilds">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  if (!guilds.length)
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-neutral-600">
        No guilds are registered yet. Register a guild to begin configuring Voicelet.
      </div>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guild ID</TableHead>
          <TableHead>Configuration</TableHead>
          <TableHead>Activation</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {guilds.map((guild) => (
          <TableRow key={guild.guildId}>
            <TableCell className="font-mono text-xs">{guild.guildId}</TableCell>
            <TableCell>
              <Badge variant={guild.configurationStatus === 'configured' ? 'success' : 'secondary'}>
                {guild.configurationStatus === 'configured' ? 'Configured' : 'Unconfigured'}
              </Badge>
            </TableCell>
            <TableCell>
              {guild.enabled === null ? (
                <Badge variant="outline">Inactive</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label={`Enable Voicelet for ${guild.guildId}`}
                    checked={guild.enabled}
                    onCheckedChange={(enabled) => onToggle(guild.guildId, enabled)}
                  />
                  <Badge variant={guild.enabled ? 'success' : 'warning'}>
                    {guild.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              )}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap justify-end gap-2">
                {guild.configurationStatus === 'unconfigured' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddConfiguration(guild.guildId)}
                  >
                    Add configuration
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onView(guild.guildId)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(guild.guildId)}>
                      Edit
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" onClick={() => onDelete(guild.guildId)}>
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
