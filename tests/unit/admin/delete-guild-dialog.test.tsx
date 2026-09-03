import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeleteGuildDialog } from '../../../admin/src/features/guilds/components/delete-guild-dialog';
import { guildAdminApi } from '../../../admin/src/features/guilds/api/guild-admin-api';

vi.mock('../../../admin/src/features/guilds/api/guild-admin-api', () => ({
  guildAdminApi: { remove: vi.fn() },
}));

describe('DeleteGuildDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it('requires confirmation and explains that Discord resources are unaffected', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DeleteGuildDialog
        guildId="123456789012345678"
        onClose={onClose}
        onDeleted={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByText(/does not delete the Discord server/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(guildAdminApi.remove).not.toHaveBeenCalled();
  });
  it('deletes only after confirmation then refreshes the list', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn().mockResolvedValue(undefined);
    vi.mocked(guildAdminApi.remove).mockResolvedValue(undefined);
    render(
      <DeleteGuildDialog
        guildId="123456789012345678"
        onClose={vi.fn()}
        onDeleted={onDeleted}
        onError={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete registration' }));
    expect(guildAdminApi.remove).toHaveBeenCalledWith('123456789012345678');
    expect(onDeleted).toHaveBeenCalledOnce();
  });
  it('retains the dialog and reports a failed deletion without pretending it succeeded', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    vi.mocked(guildAdminApi.remove).mockRejectedValue(new Error('Voicelet is unavailable.'));
    render(
      <DeleteGuildDialog
        guildId="123456789012345678"
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onError={onError}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete registration' }));
    expect(await screen.findByRole('button', { name: 'Delete registration' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith('Voicelet is unavailable.');
  });
});
