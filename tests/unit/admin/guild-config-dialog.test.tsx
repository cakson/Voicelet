import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuildConfigDialog } from '../../../admin/src/features/guilds/components/guild-config-dialog';

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
  afterEach(cleanup);
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
});
