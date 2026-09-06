import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { guildAdminApi } from '../api/guild-admin-api';

export function DeleteGuildDialog({
  guildId,
  onClose,
  onDeleted,
  onError,
}: {
  guildId: string | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  onError: (message: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  if (!guildId) return null;
  const remove = async () => {
    setPending(true);
    try {
      await guildAdminApi.remove(guildId);
      await onDeleted();
      onClose();
    } catch (error) {
      await onError(
        error instanceof Error ? error.message : 'Voicelet could not delete this guild.',
      );
      setPending(false);
    }
  };
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this guild registration?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes Voicelet’s registration and stored Voicelet configuration for{' '}
            {guildId}. It does not delete the Discord server, channels, categories, or any other
            Discord-side resource.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void remove();
            }}
            disabled={pending}
          >
            {pending ? 'Deleting…' : 'Delete registration'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
