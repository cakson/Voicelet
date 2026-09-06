import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuildConfigDialog } from '../../../admin/src/features/guilds/components/guild-config-dialog';
import { guildAdminApi } from '../../../admin/src/features/guilds/api/guild-admin-api';

vi.mock('../../../admin/src/features/guilds/api/guild-admin-api', () => ({
  guildAdminApi: { save: vi.fn() },
}));

const configuration = {
  triggerChannelId: '223456789012345678',
  destinationCategoryId: '323456789012345678',
  inactivityTimeoutMinutes: 60,
  reconciliationIntervalMinutes: 15,
  permanentChannelIds: ['423456789012345678'],
  enabled: false,
  revision: 3,
};

describe('GuildConfigDialog', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it('shows all persisted configuration values and disabled state read-only', () => {
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={configuration}
        mode="view"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(configuration.triggerChannelId)).toBeInTheDocument();
    expect(screen.getByText(configuration.destinationCategoryId)).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });
  it('prepopulates editing from persisted values', async () => {
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={configuration}
        mode="edit"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(await screen.findByLabelText(/Trigger voice channel ID/)).toHaveValue(
      configuration.triggerChannelId,
    );
    expect(screen.getByLabelText(/Temporary-room category ID/)).toHaveValue(
      configuration.destinationCategoryId,
    );
  });
  it('validates required fields without replacing displayed persisted values', async () => {
    const user = userEvent.setup();
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={configuration}
        mode="edit"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.clear(await screen.findByLabelText(/Trigger voice channel ID/));
    await user.click(screen.getByRole('button', { name: 'Save configuration' }));
    expect(
      await screen.findByText('Correct the configuration values before saving.'),
    ).toBeInTheDocument();
    expect(guildAdminApi.save).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Temporary-room category ID/)).toHaveValue(
      configuration.destinationCategoryId,
    );
  });
  it('creates an explicitly disabled configuration and refreshes after persisted save', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(guildAdminApi.save).mockResolvedValue({
      guildId: '123456789012345678',
      configuration: { ...configuration, revision: 1 },
    });
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={null}
        mode="create"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await user.type(
      await screen.findByLabelText(/Trigger voice channel ID/),
      configuration.triggerChannelId,
    );
    await user.type(
      screen.getByLabelText(/Temporary-room category ID/),
      configuration.destinationCategoryId,
    );
    await user.click(screen.getByRole('switch', { name: 'Enable Voicelet immediately' }));
    await user.click(screen.getByRole('button', { name: 'Save configuration' }));
    expect(guildAdminApi.save).toHaveBeenCalledWith(
      '123456789012345678',
      expect.objectContaining({ enabled: false }),
      null,
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('refreshes persisted state after a failed save while retaining the form values', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn().mockResolvedValue(undefined);
    vi.mocked(guildAdminApi.save).mockRejectedValue(new Error('Voicelet is unavailable.'));
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={configuration}
        mode="edit"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Save configuration' }));
    expect(await screen.findByText('Voicelet is unavailable.')).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/Trigger voice channel ID/)).toHaveValue(
      configuration.triggerChannelId,
    );
  });
  it('explains configuration fields and the protected-channel input format', async () => {
    const user = userEvent.setup();
    render(
      <GuildConfigDialog
        guildId="123456789012345678"
        configuration={null}
        mode="create"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await user.tab();
    expect(screen.getAllByRole('tooltip')[0]).toHaveTextContent('lobby members join');
    expect(screen.getByLabelText(/Protected permanent channel IDs/)).toHaveAttribute(
      'placeholder',
      expect.stringContaining('\n'),
    );
    expect(screen.getAllByRole('tooltip')[4]).toHaveTextContent(
      'One Discord channel ID per line. Do not use commas.',
    );
  });
});
