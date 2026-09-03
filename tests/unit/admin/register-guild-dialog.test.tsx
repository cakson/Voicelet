import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterGuildDialog } from '../../../admin/src/features/guilds/components/register-guild-dialog';
import { guildAdminApi } from '../../../admin/src/features/guilds/api/guild-admin-api';

vi.mock('../../../admin/src/features/guilds/api/guild-admin-api', () => ({
  guildAdminApi: { register: vi.fn() },
}));

describe('RegisterGuildDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it('rejects an invalid guild ID before invoking the API', async () => {
    const user = userEvent.setup();
    render(<RegisterGuildDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText(/Discord guild ID/), 'not-a-snowflake');
    await user.click(screen.getByRole('button', { name: 'Register guild' }));
    expect(await screen.findByText('Enter a valid Discord identifier.')).toBeInTheDocument();
    expect(guildAdminApi.register).not.toHaveBeenCalled();
  });
  it('registers an unconfigured guild and refreshes the authoritative list', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(guildAdminApi.register).mockResolvedValue({
      guildId: '123456789012345678',
      configuration: null,
    });
    render(<RegisterGuildDialog open onOpenChange={vi.fn()} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/Discord guild ID/), '123456789012345678');
    await user.click(screen.getByRole('button', { name: 'Register guild' }));
    expect(guildAdminApi.register).toHaveBeenCalledWith('123456789012345678', undefined);
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('allows an initial explicitly disabled configuration and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveRegistration: (() => void) | undefined;
    vi.mocked(guildAdminApi.register).mockImplementation(
      () => new Promise((resolve) => (resolveRegistration = () => resolve({} as never))),
    );
    render(<RegisterGuildDialog open onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText(/Discord guild ID/), '123456789012345678');
    await user.click(screen.getByLabelText('Configure Voicelet now'));
    await user.type(screen.getByLabelText(/Trigger voice channel ID/), '223456789012345678');
    await user.type(screen.getByLabelText(/Temporary-room category ID/), '323456789012345678');
    await user.click(screen.getByRole('switch', { name: 'Enable Voicelet immediately' }));
    const submit = screen.getByRole('button', { name: 'Register guild' });
    await user.click(submit);
    await user.click(submit);
    expect(guildAdminApi.register).toHaveBeenCalledTimes(1);
    expect(guildAdminApi.register).toHaveBeenCalledWith(
      '123456789012345678',
      expect.objectContaining({ enabled: false }),
    );
    resolveRegistration?.();
  });
});
